import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { TaskBlock } from '../blocks/task-block.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';
import { EventsGateway } from '../gateway/events.gateway';
import { TaskTimeService } from './task-time.service';

@Injectable()
export class TaskLifecycleService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(TaskBlock)
    private blockRepo: Repository<TaskBlock>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private auditLog: AuditLogService,
    private events: EventsGateway,
    private taskTime: TaskTimeService,
  ) {}

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private async findOneBasic(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    return task;
  }

  private async findOneFull(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: [
        'owner',
        'timeEntries',
        'timeEntries.teamMember',
        'comments',
        'comments.author',
        'blocks',
        'blocks.blockedBy',
        'blocks.resolvedBy',
      ],
    });
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    return task;
  }

  private async assertOwnerOrAdmin(task: Task, userId: string): Promise<void> {
    if (task.ownerId === userId) return;
    const performer = await this.memberRepo.findOne({ where: { id: userId } });
    if (!performer?.isAdmin) {
      throw new ForbiddenException('FORBIDDEN_ACTION');
    }
  }

  private async assertAdmin(userId: string): Promise<void> {
    const performer = await this.memberRepo.findOne({ where: { id: userId } });
    if (!performer?.isAdmin) {
      throw new ForbiddenException('ADMIN_ONLY');
    }
  }

  /**
   * Emits a task event to the org room when orgId is available,
   * or falls back to broadcast for legacy tasks without an org.
   */
  private emitTaskEvent(event: string, task: Task, payload?: unknown) {
    const data = payload ?? task;
    if (task.orgId) {
      this.events.emitToOrg(event, task.orgId, data);
    } else {
      this.events.emitToAll(event, data);
    }
  }

  /** Fetches the full task and broadcasts task:updated to the org room. */
  private async findAndEmitUpdate(id: string): Promise<Task> {
    const task = await this.findOneFull(id);
    this.emitTaskEvent('task:updated', task);
    return task;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle methods
  // ---------------------------------------------------------------------------

  /**
   * Activates a task: BACKLOG/STANDBY → IN_PROGRESS.
   * @throws BadRequestException, ConflictException
   */
  async activate(id: string, userId: string, ownerId?: string, resolutionNote?: string) {
    const task = await this.findOneBasic(id);

    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('TASK_ALREADY_ACTIVE');
    }
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException('TASK_DONE_USE_UNDO');
    }

    const targetOwnerId = ownerId || userId;

    // Self-only activation: non-admins can only activate for themselves
    if (targetOwnerId !== userId) {
      const performer = await this.memberRepo.findOne({ where: { id: userId } });
      if (!performer?.isAdmin) {
        throw new BadRequestException('ADMIN_ONLY_ACTIVATE_OTHERS');
      }
    }

    // Check max 1 active card per member
    const activeCount = await this.taskRepo.count({
      where: { ownerId: targetOwnerId, status: TaskStatus.IN_PROGRESS },
    });
    if (activeCount > 0) {
      throw new ConflictException('MAX_ACTIVE_REACHED');
    }

    // If task was blocked, require resolution note
    if (task.isBlocked) {
      if (!resolutionNote) {
        throw new BadRequestException('BLOCKED_NEEDS_RESOLUTION');
      }
      const openBlock = await this.blockRepo.findOne({
        where: { task: { id }, resolvedAt: IsNull() },
        order: { blockedAt: 'DESC' },
      });
      if (openBlock) {
        await this.blockRepo.query(
          `UPDATE task_blocks SET resolved_by_id = $1, resolution_note = $2, resolved_at = $3 WHERE id = $4`,
          [userId, resolutionNote, new Date(), openBlock.id],
        );
      }
      task.isBlocked = false;
    }

    const oldStatus = task.status;
    const oldData = { status: task.status, ownerId: task.ownerId };
    task.status = TaskStatus.IN_PROGRESS;
    task.ownerId = targetOwnerId;
    task.updatedBy = userId;
    const saved = await this.taskRepo.save(task);

    await this.taskTime.recordTransition(id, oldStatus, TaskStatus.IN_PROGRESS, userId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { status: saved.status, ownerId: saved.ownerId },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Blocks an IN_PROGRESS task → STANDBY.
   * @throws BadRequestException, ForbiddenException
   */
  async block(id: string, userId: string, reason: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_BLOCK');
    }

    const oldData = { status: task.status, isBlocked: task.isBlocked };

    await this.taskTime.closeOpenTimeEntry(id);

    await this.blockRepo.query(
      `INSERT INTO task_blocks (id, task_id, blocked_by_id, block_reason, blocked_at) VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
      [id, userId, reason, new Date()],
    );

    task.status = TaskStatus.STANDBY;
    task.isBlocked = true;
    task.updatedBy = userId;
    await this.taskRepo.save(task);

    await this.taskTime.recordTransition(id, TaskStatus.IN_PROGRESS, TaskStatus.STANDBY, userId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { status: TaskStatus.STANDBY, isBlocked: true, blockReason: reason },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Completes an IN_PROGRESS task → DONE.
   * @throws BadRequestException, ForbiddenException
   */
  async complete(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_COMPLETE');
    }

    const oldData = { status: task.status };

    await this.taskTime.closeOpenTimeEntry(id);

    task.status = TaskStatus.DONE;
    task.completedAt = new Date();
    task.updatedBy = userId;
    await this.taskRepo.save(task);

    await this.taskTime.recordTransition(id, TaskStatus.IN_PROGRESS, TaskStatus.DONE, userId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { status: TaskStatus.DONE, completedAt: task.completedAt },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Undoes a completed task: DONE → STANDBY.
   * @throws BadRequestException if limit (3x) reached or wrong status
   */
  async undo(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.DONE) {
      throw new BadRequestException('ONLY_DONE_CAN_UNDO');
    }
    if (task.undoCount >= 3) {
      throw new BadRequestException('UNDO_LIMIT_REACHED');
    }

    const oldData = {
      status: task.status,
      completedAt: task.completedAt,
      undoCount: task.undoCount,
    };
    task.status = TaskStatus.STANDBY;
    task.completedAt = null as any;
    task.isArchived = false;
    task.undoCount += 1;
    task.updatedBy = userId;
    const saved = await this.taskRepo.save(task);

    await this.taskTime.recordTransition(id, TaskStatus.DONE, TaskStatus.STANDBY, userId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { status: saved.status, undoCount: saved.undoCount },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Changes the owner of an IN_PROGRESS task (admin only).
   * @throws ForbiddenException, BadRequestException, ConflictException
   */
  async changeOwner(id: string, userId: string, newOwnerId: string) {
    await this.assertAdmin(userId);
    const task = await this.findOneBasic(id);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_CHANGE_OWNER');
    }

    const newOwner = await this.memberRepo.findOne({ where: { id: newOwnerId } });
    if (!newOwner) throw new NotFoundException('MEMBER_NOT_FOUND');

    const activeCount = await this.taskRepo.count({
      where: { ownerId: newOwnerId, status: TaskStatus.IN_PROGRESS },
    });
    if (activeCount > 0) {
      throw new ConflictException('NEW_OWNER_MAX_ACTIVE_REACHED');
    }

    const oldData = { ownerId: task.ownerId };

    await this.taskTime.closeOpenTimeEntry(id);
    await this.taskTime.openTimeEntry(id, newOwnerId);

    await this.taskRepo.update(id, { ownerId: newOwnerId, updatedBy: userId });

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { ownerId: newOwnerId },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Soft-deletes a task (admin only).
   * @throws ForbiddenException
   */
  async softDelete(id: string, userId: string) {
    await this.assertAdmin(userId);
    const task = await this.findOneBasic(id);
    const oldData = { ...task };

    await this.taskTime.closeOpenTimeEntry(id);

    task.deletedBy = userId;
    await this.taskRepo.save(task);
    await this.taskRepo.softRemove(task);

    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.DELETE,
      oldData,
      performedBy: userId,
    });
    this.emitTaskEvent('task:deleted', task, { taskId: id });
    return { message: 'Task removida' };
  }

  /**
   * Archives a DONE task.
   * @throws BadRequestException, ForbiddenException
   */
  async archive(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.DONE) {
      throw new BadRequestException('ONLY_DONE_CAN_ARCHIVE');
    }
    const oldData = { isArchived: task.isArchived };
    task.isArchived = true;
    task.updatedBy = userId;
    await this.taskRepo.save(task);
    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { isArchived: true },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }

  /**
   * Pauses an IN_PROGRESS task's time tracking.
   * @throws BadRequestException, ForbiddenException
   */
  async pause(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_PAUSE');
    }

    await this.taskTime.pause(id, userId);
    return this.findAndEmitUpdate(id);
  }

  /**
   * Resumes an IN_PROGRESS task's time tracking.
   * @throws BadRequestException, ForbiddenException
   */
  async resume(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_RESUME');
    }

    await this.taskTime.resume(id, task.ownerId, userId);
    return this.findAndEmitUpdate(id);
  }

  /**
   * Starts manual time tracking for an IN_PROGRESS task.
   * @throws BadRequestException, ForbiddenException
   */
  async startTracking(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('ONLY_IN_PROGRESS_CAN_START_TRACKING');
    }

    await this.taskTime.startTracking(id, task.ownerId, userId);
    return this.findAndEmitUpdate(id);
  }

  /**
   * Unarchives a DONE task.
   * @throws BadRequestException, ForbiddenException
   */
  async unarchive(id: string, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status !== TaskStatus.DONE) {
      throw new BadRequestException('ONLY_DONE_CAN_UNARCHIVE');
    }
    const oldData = { isArchived: task.isArchived };
    task.isArchived = false;
    task.updatedBy = userId;
    await this.taskRepo.save(task);
    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: { isArchived: false },
      performedBy: userId,
    });
    return this.findAndEmitUpdate(id);
  }
}
