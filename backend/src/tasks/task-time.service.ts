import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TaskTimeEntry } from './task-time-entry.entity';
import { StatusTransition } from './status-transition.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

@Injectable()
export class TaskTimeService {
  constructor(
    @InjectRepository(TaskTimeEntry)
    private timeEntryRepo: Repository<TaskTimeEntry>,
    @InjectRepository(StatusTransition)
    private transitionRepo: Repository<StatusTransition>,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Closes the most recent open time entry for a task.
   * @param taskId - The task to close the entry for
   */
  async closeOpenTimeEntry(taskId: string) {
    const openEntry = await this.timeEntryRepo.findOne({
      where: { taskId, endedAt: IsNull() },
      order: { startedAt: 'DESC' },
    });
    if (openEntry) {
      openEntry.endedAt = new Date();
      await this.timeEntryRepo.save(openEntry);
    }
  }

  /**
   * Opens a new time entry for a task/member.
   * @param taskId - The task to start tracking
   * @param memberId - The member tracking time
   */
  async openTimeEntry(taskId: string, memberId: string) {
    const timeEntry = this.timeEntryRepo.create({
      taskId,
      teamMemberId: memberId,
      startedAt: new Date(),
    });
    await this.timeEntryRepo.save(timeEntry);
  }

  /**
   * Checks whether a task has an open (running) time entry.
   * @param taskId - The task to check
   * @returns The open entry or null
   */
  async findOpenEntry(taskId: string): Promise<TaskTimeEntry | null> {
    return this.timeEntryRepo.findOne({
      where: { taskId, endedAt: IsNull() },
    });
  }

  /**
   * Starts manual time tracking for an IN_PROGRESS task.
   * @param taskId - The task to track
   * @param ownerId - The task owner
   * @param userId - The user performing the action
   * @throws BadRequestException if tracking is already active
   */
  async startTracking(taskId: string, ownerId: string, userId: string) {
    const openEntry = await this.findOpenEntry(taskId);
    if (openEntry) {
      throw new BadRequestException('TRACKING_ALREADY_ACTIVE');
    }

    await this.openTimeEntry(taskId, ownerId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: taskId,
      action: AuditAction.UPDATE,
      oldData: { tracking: false },
      newData: { tracking: true },
      performedBy: userId,
    });
  }

  /**
   * Pauses time tracking by closing the open entry.
   * @param taskId - The task to pause
   * @param userId - The user performing the action
   * @throws BadRequestException if already paused
   */
  async pause(taskId: string, userId: string) {
    const openEntry = await this.findOpenEntry(taskId);
    if (!openEntry) {
      throw new BadRequestException('TASK_ALREADY_PAUSED');
    }

    await this.closeOpenTimeEntry(taskId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: taskId,
      action: AuditAction.UPDATE,
      oldData: { paused: false },
      newData: { paused: true },
      performedBy: userId,
    });
  }

  /**
   * Resumes time tracking by opening a new entry.
   * @param taskId - The task to resume
   * @param ownerId - The task owner
   * @param userId - The user performing the action
   * @throws BadRequestException if not paused
   */
  async resume(taskId: string, ownerId: string, userId: string) {
    const openEntry = await this.findOpenEntry(taskId);
    if (openEntry) {
      throw new BadRequestException('TASK_NOT_PAUSED');
    }

    await this.openTimeEntry(taskId, ownerId);

    await this.auditLog.log({
      entityType: 'task',
      entityId: taskId,
      action: AuditAction.UPDATE,
      oldData: { paused: true },
      newData: { paused: false },
      performedBy: userId,
    });
  }

  /**
   * Calculates how long a task spent in each status.
   * @param taskId - The task to calculate durations for
   * @returns Object with taskId and durations in hours per status
   */
  async getStatusDurations(taskId: string) {
    const transitions = await this.transitionRepo.find({
      where: { taskId },
      order: { transitionedAt: 'ASC' },
    });

    if (transitions.length === 0) {
      return { taskId, durations: {} };
    }

    const durations: Record<string, number> = {};
    for (let i = 0; i < transitions.length; i++) {
      const status = transitions[i].toStatus;
      const start = new Date(transitions[i].transitionedAt).getTime();
      const end =
        i + 1 < transitions.length
          ? new Date(transitions[i + 1].transitionedAt).getTime()
          : Date.now();
      durations[status] = (durations[status] || 0) + (end - start);
    }

    // Convert ms to hours
    const durationsHours: Record<string, number> = {};
    for (const [status, ms] of Object.entries(durations)) {
      durationsHours[status] = Math.round((ms / 3600000) * 100) / 100;
    }

    return { taskId, durations: durationsHours };
  }

  /**
   * Records a status transition for audit trail.
   * @param taskId - The task being transitioned
   * @param fromStatus - Previous status
   * @param toStatus - New status
   * @param userId - The user who triggered the transition
   */
  async recordTransition(
    taskId: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
  ) {
    const transition = this.transitionRepo.create({
      taskId,
      fromStatus,
      toStatus,
      transitionedBy: userId,
    });
    await this.transitionRepo.save(transition);
  }
}
