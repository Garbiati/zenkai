import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

export type MembershipRole = 'owner' | 'admin' | 'member';

/**
 * Representa a associação de um TeamMember a uma Organization.
 * Um membro pode pertencer a múltiplas organizações (ex: consultant).
 * @see ADR 0007 — Multi-tenancy model
 */
@Entity('memberships')
@Unique(['orgId', 'memberId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  /** Papel do membro na organização. */
  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: MembershipRole;

  /** Quem enviou o convite. NULL = criou a própria org. */
  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
