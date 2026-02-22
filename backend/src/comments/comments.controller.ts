import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private service: CommentsService) {}

  @Get()
  findByTask(@Param('taskId') taskId: string) {
    return this.service.findByTask(taskId);
  }

  @Post()
  create(@Param('taskId') taskId: string, @Body() dto: CreateCommentDto, @Request() req) {
    return this.service.create(taskId, req.user.sub, dto.content);
  }
}
