import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { TaskComment } from '../comments/task-comment.entity';
import { TaskBlock } from '../blocks/task-block.entity';
import { Organization } from '../organizations/organization.entity';

export enum TaskStatus {
  BACKLOG = 'backlog',
  STANDBY = 'standby',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.BACKLOG })
  status: TaskStatus;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string;

  @ManyToOne(() => TeamMember, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'undo_count', type: 'int', default: 0 })
  undoCount: number;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedHours: number | null;

  @Column({ name: 'predicted_completion', type: 'timestamp', nullable: true })
  predictedCompletion: Date | null;

  @OneToMany(() => TaskTimeEntry, (entry) => entry.task)
  timeEntries: TaskTimeEntry[];

  @OneToMany(() => TaskComment, (comment) => comment.task)
  comments: TaskComment[];

  @OneToMany(() => TaskBlock, (block) => block.task)
  blocks: TaskBlock[];
}
