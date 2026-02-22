import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { StatusTransition } from './status-transition.entity';
import { TaskBlock } from '../blocks/task-block.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { TasksService } from './tasks.service';
import { TaskTimeService } from './task-time.service';
import { TaskLifecycleService } from './task-lifecycle.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskTimeEntry, StatusTransition, TaskBlock, TeamMember]),
    EventsModule,
  ],
  providers: [TasksService, TaskTimeService, TaskLifecycleService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
