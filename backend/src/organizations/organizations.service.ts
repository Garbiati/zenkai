import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { Membership, MembershipRole } from './membership.entity';

export const PLAN_LIMITS = {
  free: { maxMembers: 7 },
  pro: { maxMembers: Infinity },
} as const;

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
  ) {}

  /**
   * Cria uma organização e associa o criador como owner.
   * Chamado automaticamente no fluxo de self-registration.
   * @param name - Nome do time
   * @param ownerId - ID do TeamMember que registrou
   * @returns Organização criada com membership de owner
   * @see ADR 0007 — Self-registration flow
   */
  async createWithOwner(name: string, ownerId: string): Promise<Organization> {
    const slug = await this.generateUniqueSlug(name);

    const org = this.orgRepo.create({ name, slug, plan: 'free', ownerId });
    const savedOrg = await this.orgRepo.save(org);

    const membership = this.membershipRepo.create({
      orgId: savedOrg.id,
      memberId: ownerId,
      role: 'owner' as MembershipRole,
    });
    await this.membershipRepo.save(membership);

    return savedOrg;
  }

  /**
   * Busca a organização pelo dono (owner).
   * Usado no fluxo de registro para obter o orgId após criar a org.
   * @param ownerId - ID do TeamMember owner
   * @returns Organização encontrada
   * @throws EntityNotFoundError se não encontrado
   */
  async findByOwner(ownerId: string): Promise<Organization> {
    return this.orgRepo.findOneOrFail({ where: { ownerId } });
  }

  /**
   * Conta memberships ativos de uma organização.
   * Usado para enforçar limite de plano free (7 membros).
   * @param orgId - ID da organização
   * @returns Contagem de membros
   */
  async countMembers(orgId: string): Promise<number> {
    return this.membershipRepo.count({ where: { orgId } });
  }

  /**
   * Gera slug único a partir do nome do time.
   * Adiciona sufixo numérico em caso de colisão.
   * @param name - Nome original
   * @returns Slug único e URL-safe
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90);

    let slug = base;
    let attempt = 0;

    while (await this.orgRepo.findOne({ where: { slug } })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }
}
