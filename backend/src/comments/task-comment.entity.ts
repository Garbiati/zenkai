import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from '../tasks/task.entity';
import { TeamMember } from '../team-members/team-member.entity';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.comments)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => TeamMember)
  @JoinColumn({ name: 'author_id' })
  author: TeamMember;

  @Column({ name: 'is_owner', type: 'boolean' })
  isOwner: boolean;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
