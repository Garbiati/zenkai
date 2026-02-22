import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { TeamMember } from '../team-members/team-member.entity';

@Entity('status_transitions')
export class StatusTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'from_status', type: 'varchar', length: 20 })
  fromStatus: string;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: string;

  @CreateDateColumn({ name: 'transitioned_at' })
  transitionedAt: Date;

  @Column({ name: 'transitioned_by', type: 'uuid' })
  transitionedBy: string;

  @ManyToOne(() => TeamMember)
  @JoinColumn({ name: 'transitioned_by' })
  transitionedByMember: TeamMember;
}
