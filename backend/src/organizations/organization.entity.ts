import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Representa um time/organização no sistema SaaS.
 * Cada registro criado via self-registration gera uma Organization automaticamente.
 * @see ADR 0007 — Multi-tenancy model
 */
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nome amigável do time. Ex: "Acme Dev Team" */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Identificador URL-safe único. Ex: "acme-dev-team". */
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  /** Plano atual. 'free' limita a 7 membros. */
  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: string;

  /** ID do membro que criou a organização (owner). */
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
