import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from '../tasks/task.entity';
import { TeamMember } from '../team-members/team-member.entity';

@Entity('task_blocks')
export class TaskBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.blocks, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => TeamMember, { nullable: false })
  @JoinColumn({ name: 'blocked_by_id' })
  blockedBy: TeamMember;

  @Column({ name: 'block_reason', type: 'text' })
  blockReason: string;

  @ManyToOne(() => TeamMember, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: TeamMember;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string;

  @Column({ name: 'blocked_at', type: 'timestamp' })
  blockedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;
}
