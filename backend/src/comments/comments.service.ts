import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from './task-comment.entity';
import { Task } from '../tasks/task.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private commentRepo: Repository<TaskComment>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    private auditLog: AuditLogService,
  ) {}

  async findByTask(taskId: string) {
    return this.commentRepo.find({
      where: { taskId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(taskId: string, authorId: string, content: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task não encontrada');

    const isOwner = task.ownerId === authorId;

    const comment = this.commentRepo.create({
      taskId,
      authorId,
      isOwner,
      content,
    });
    const saved = await this.commentRepo.save(comment);

    await this.auditLog.log({
      entityType: 'task_comment',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newData: saved,
      performedBy: authorId,
    });

    return this.commentRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });
  }
}
