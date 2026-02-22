import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { TaskLifecycleService } from './task-lifecycle.service';
import { TaskTimeService } from './task-time.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { BlockTaskDto, ActivateTaskDto, ChangeOwnerDto } from './dto/block-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private service: TasksService,
    private lifecycle: TaskLifecycleService,
    private taskTime: TaskTimeService,
  ) {}

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('blocked') blocked?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.service.findAll(req.user.orgId, { status, blocked, ownerId });
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Get(':id/status-durations')
  getStatusDurations(@Param('id') id: string) {
    return this.taskTime.getStatusDurations(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @Request() req) {
    return this.service.create(dto, req.user.sub, req.user.orgId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateTaskDto, @Request() req) {
    return this.lifecycle.activate(id, req.user.sub, dto.ownerId, dto.resolutionNote);
  }

  @Patch(':id/block')
  block(@Param('id') id: string, @Body() dto: BlockTaskDto, @Request() req) {
    return this.lifecycle.block(id, req.user.sub, dto.reason);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req) {
    return this.lifecycle.complete(id, req.user.sub);
  }

  @Patch(':id/undo')
  undo(@Param('id') id: string, @Request() req) {
    return this.lifecycle.undo(id, req.user.sub);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.lifecycle.archive(id, req.user.sub);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string, @Request() req) {
    return this.lifecycle.unarchive(id, req.user.sub);
  }

  @Patch(':id/pause')
  pause(@Param('id') id: string, @Request() req) {
    return this.lifecycle.pause(id, req.user.sub);
  }

  @Patch(':id/resume')
  resume(@Param('id') id: string, @Request() req) {
    return this.lifecycle.resume(id, req.user.sub);
  }

  @Post(':id/start-tracking')
  startTracking(@Param('id') id: string, @Request() req) {
    return this.lifecycle.startTracking(id, req.user.sub);
  }

  @Patch(':id/change-owner')
  changeOwner(@Param('id') id: string, @Body() dto: ChangeOwnerDto, @Request() req) {
    return this.lifecycle.changeOwner(id, req.user.sub, dto.newOwnerId);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @Request() req) {
    return this.lifecycle.softDelete(id, req.user.sub);
  }
}
