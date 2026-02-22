import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskBlock } from './task-block.entity';

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(TaskBlock)
    private blockRepo: Repository<TaskBlock>,
  ) {}

  async findByTask(taskId: string) {
    return this.blockRepo.find({
      where: { task: { id: taskId } },
      relations: ['blockedBy', 'resolvedBy'],
      order: { blockedAt: 'DESC' },
    });
  }
}
