import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';
import { EventsGateway } from '../gateway/events.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private auditLog: AuditLogService,
    private events: EventsGateway,
  ) {}

  /**
   * Lists tasks with optional filters, scoped to an organization.
   * @param orgId - Organization ID for tenant isolation
   * @param filters - Optional status, blocked, ownerId filters
   */
  async findAll(
    orgId: string | null,
    filters?: { status?: string; blocked?: string; ownerId?: string },
  ) {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.owner', 'owner')
      .leftJoinAndSelect('task.timeEntries', 'timeEntries')
      .leftJoinAndSelect('timeEntries.teamMember', 'timeMember')
      .leftJoinAndSelect('task.blocks', 'blocks')
      .where('task.deletedAt IS NULL');

    if (orgId) {
      qb.andWhere('task.orgId = :orgId', { orgId });
    }
    if (filters?.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters?.blocked === 'true') {
      qb.andWhere('task.isBlocked = true');
    }
    if (filters?.ownerId) {
      qb.andWhere('task.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    qb.orderBy('task.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Finds a single task with all relations.
   * @param id - Task ID
   * @throws NotFoundException if task not found
   */
  async findOne(id: string) {
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

  /**
   * Creates a new task in BACKLOG status.
   * @param dto - Title, description, estimatedHours
   * @param userId - Creator's member ID
   * @param orgId - Organization ID for tenant isolation
   */
  async create(dto: CreateTaskDto, userId: string, orgId?: string | null) {
    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      estimatedHours: dto.estimatedHours ?? null,
      status: TaskStatus.BACKLOG,
      createdBy: userId,
      orgId: orgId ?? undefined,
    });
    const saved = await this.taskRepo.save(task);
    await this.auditLog.log({
      entityType: 'task',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newData: saved,
      performedBy: userId,
    });
    this.emitTaskEvent('task:created', saved);
    return saved;
  }

  /**
   * Updates a task's title, description, or estimatedHours.
   * @param id - Task ID
   * @param dto - Fields to update
   * @param userId - Performer's member ID
   * @throws BadRequestException if task is DONE
   * @throws ForbiddenException if not owner or admin
   */
  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.findOneBasic(id);
    await this.assertOwnerOrAdmin(task, userId);
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException('CANNOT_EDIT_DONE');
    }
    const oldData = { ...task };
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.estimatedHours !== undefined) task.estimatedHours = dto.estimatedHours;
    task.updatedBy = userId;
    const saved = await this.taskRepo.save(task);
    await this.auditLog.log({
      entityType: 'task',
      entityId: id,
      action: AuditAction.UPDATE,
      oldData,
      newData: saved,
      performedBy: userId,
    });
    this.emitTaskEvent('task:updated', saved);
    return saved;
  }

  /**
   * Gets audit history for a task.
   * @param id - Task ID
   * @returns Task with audit entries, time entries, and blocks
   */
  async getHistory(id: string) {
    const task = await this.findOne(id);
    const entries = await this.auditLog.findByEntity('task', id);
    return {
      task,
      entries: entries.map((e) => ({
        id: e.id,
        action: e.action,
        oldData: e.oldData,
        newData: e.newData,
        performedBy: e.performedBy,
        performerName: e.performer?.name || 'Sistema',
        performedAt: e.performedAt,
      })),
      timeEntries: task.timeEntries,
      blocks: task.blocks,
    };
  }

  // ---------------------------------------------------------------------------
  // Shared helpers (also used by sub-services via module injection)
  // ---------------------------------------------------------------------------

  private async findOneBasic(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['owner'],
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
}
