import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType, entityId },
      relations: ['performer'],
      order: { performedAt: 'ASC' },
    });
  }

  async log(params: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    oldData?: any;
    newData?: any;
    performedBy: string;
  }) {
    const entry = this.auditRepo.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldData: params.oldData || null,
      newData: params.newData || null,
      performedBy: params.performedBy,
    });
    await this.auditRepo.save(entry);
  }
}
