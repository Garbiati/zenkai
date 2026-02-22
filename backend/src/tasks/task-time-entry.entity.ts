import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { TeamMember } from '../team-members/team-member.entity';

@Entity('task_time_entries')
export class TaskTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.timeEntries)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'team_member_id', type: 'uuid' })
  teamMemberId: string;

  @ManyToOne(() => TeamMember)
  @JoinColumn({ name: 'team_member_id' })
  teamMember: TeamMember;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;
}
