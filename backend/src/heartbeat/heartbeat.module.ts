import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from '../team-members/team-member.entity';
import { Task } from '../tasks/task.entity';
import { TaskTimeEntry } from '../tasks/task-time-entry.entity';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatController } from './heartbeat.controller';
import { WorkScheduleModule } from '../work-schedule/work-schedule.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMember, Task, TaskTimeEntry]),
    WorkScheduleModule,
  ],
  controllers: [HeartbeatController],
  providers: [HeartbeatService],
})
export class HeartbeatModule {}
