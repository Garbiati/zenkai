import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { MembershipRole } from './membership.entity';

/**
 * Convite para entrar em uma organização.
 * Suporta dois modos:
 *  - email-based: email preenchido, apenas aquele destinatário pode aceitar
 *  - open invite (Discord-style): email null, qualquer pessoa com o link pode aceitar
 * Token UUID; aceite cria TeamMember + Membership automaticamente.
 * @see ADR 0007 — Multi-tenancy model
 * @see ADR 0008 — Email transacional (futuro)
 */
@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  /** NULL = open invite (qualquer pessoa com o link pode aceitar). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  /** Token único enviado no link de convite. UUID v4. */
  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: MembershipRole;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  /** Validade do convite. Padrão: now() + 7 dias. */
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  /** NULL = pendente. Preenchido ao aceitar o convite. */
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  /** Máximo de usos. NULL = ilimitado (para open invites). */
  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  /** Contador de aceites. Usado para verificar maxUses. */
  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
