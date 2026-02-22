import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('blocks')
@ApiBearerAuth()
@Controller('tasks/:taskId/blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private service: BlocksService) {}

  @Get()
  findByTask(@Param('taskId') taskId: string) {
    return this.service.findByTask(taskId);
  }
}
