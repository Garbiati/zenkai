import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TeamMember } from '../team-members/team-member.entity';

@Entity('work_schedules')
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid', nullable: true })
  memberId: string | null;

  @ManyToOne(() => TeamMember, { nullable: true })
  @JoinColumn({ name: 'member_id' })
  member: TeamMember;

  @Column({ name: 'start_time', type: 'varchar', length: 5, default: '08:00' })
  startTime: string;

  @Column({ name: 'lunch_start', type: 'varchar', length: 5, default: '12:00' })
  lunchStart: string;

  @Column({ name: 'lunch_end', type: 'varchar', length: 5, default: '13:00' })
  lunchEnd: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5, default: '17:00' })
  endTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
