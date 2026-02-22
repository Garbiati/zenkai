import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Invitation } from '../organizations/invitation.entity';
import { Organization } from '../organizations/organization.entity';
import { Membership } from '../organizations/membership.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { PLAN_LIMITS } from '../organizations/organizations.service';
import { MailService } from '../mail/mail.service';

/**
 * Gerencia o fluxo completo de convites.
 * Suporta convites por email e open invites (Discord-style, sem email obrigatório).
 * @see ADR 0007 — Multi-tenancy model
 * @see ADR 0008 — Email transacional
 */
@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /** Calcula expiresAt a partir de expiresIn string. */
  private calcExpiresAt(expiresIn?: '1h' | '24h' | '7d' | 'never'): Date {
    const d = new Date();
    switch (expiresIn) {
      case '1h':
        d.setHours(d.getHours() + 1);
        break;
      case '24h':
        d.setDate(d.getDate() + 1);
        break;
      case 'never':
        d.setFullYear(d.getFullYear() + 100);
        break;
      default: // '7d'
        d.setDate(d.getDate() + 7);
    }
    return d;
  }

  /**
   * Cria um convite para entrar na organização do invitador.
   * Suporta email-based e open invite (email omitido).
   * Enforça limite de plano (free = 7 membros).
   * @param inviterId - ID do membro que está convidando (owner ou admin)
   * @param dto - email opcional, role, expiresIn, maxUses
   * @returns O convite criado com token e link
   * @throws ForbiddenException se invitador não é owner/admin
   * @throws BadRequestException se limite de membros atingido
   * @throws ConflictException se email já tem convite pendente (email-based only)
   */
  async create(inviterId: string, dto: CreateInvitationDto) {
    const membership = await this.membershipRepo.findOne({
      where: { memberId: inviterId },
    });
    if (!membership) throw new NotFoundException('MEMBER_NOT_IN_ORG');

    const { role: callerRole, orgId } = membership;
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      throw new ForbiddenException('ADMIN_ONLY');
    }

    const org = await this.orgRepo.findOneOrFail({ where: { id: orgId } });
    const currentCount = await this.membershipRepo.count({ where: { orgId } });
    const limit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS]?.maxMembers ?? 7;
    if (currentCount >= limit) {
      throw new BadRequestException('PLAN_MEMBER_LIMIT_REACHED');
    }

    // Email-based validations (skip for open invites)
    if (dto.email) {
      const existingMember = await this.memberRepo.findOne({ where: { email: dto.email } });
      if (existingMember) throw new ConflictException('EMAIL_TAKEN');

      const existingInvite = await this.invitationRepo.findOne({
        where: { orgId, email: dto.email, acceptedAt: undefined as unknown as Date },
      });
      if (
        existingInvite &&
        existingInvite.acceptedAt === null &&
        existingInvite.expiresAt > new Date()
      ) {
        throw new ConflictException('INVITATION_ALREADY_SENT');
      }
    }

    const expiresAt = this.calcExpiresAt(dto.expiresIn);

    const invitation = this.invitationRepo.create({
      orgId,
      email: dto.email ?? null,
      token: randomUUID(),
      role: dto.role ?? 'member',
      invitedBy: inviterId,
      expiresAt,
      maxUses: dto.maxUses ?? null,
      useCount: 0,
      acceptedAt: null as unknown as Date,
    });
    const saved = await this.invitationRepo.save(invitation);

    const inviteLink = `${process.env.APP_URL || 'http://localhost:3000'}/invite/${saved.token}`;

    // Send invite email for email-based invites (fire-and-forget — does not block the response)
    if (saved.email) {
      void this.mailService.sendInvite(saved.email, inviteLink, org.name);
    }

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      expiresAt: saved.expiresAt,
      token: saved.token,
      maxUses: saved.maxUses,
      useCount: saved.useCount,
      inviteLink,
    };
  }

  /**
   * Busca os detalhes de um convite pelo token (para o frontend exibir a tela de aceite).
   * @param token - Token UUID do convite
   * @returns Detalhes do convite + nome da organização
   * @throws NotFoundException se token inválido
   * @throws BadRequestException se convite expirado ou esgotado
   */
  async findByToken(token: string) {
    const invitation = await this.invitationRepo.findOne({ where: { token } });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');

    // Open invites use useCount; email-based use acceptedAt
    if (!this.isOpenInvite(invitation)) {
      if (invitation.acceptedAt) throw new BadRequestException('INVITATION_ALREADY_ACCEPTED');
    } else {
      if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
        throw new BadRequestException('INVITATION_USES_EXHAUSTED');
      }
    }

    if (invitation.expiresAt < new Date()) throw new BadRequestException('INVITATION_EXPIRED');

    const org = await this.orgRepo.findOne({ where: { id: invitation.orgId } });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      orgName: org?.name ?? 'Unknown Team',
      isOpenInvite: this.isOpenInvite(invitation),
    };
  }

  /**
   * Aceita um convite: cria TeamMember + Membership e retorna JWT.
   * Para open invites, email no DTO é opcional (pode ser fornecido pelo usuário).
   * @param token - Token UUID do convite
   * @param dto - Dados do novo membro (name, username, password, email?)
   * @returns JWT + dados do usuário (mesmo formato do login)
   * @throws NotFoundException / BadRequestException em caso de token inválido/expirado
   * @throws ConflictException se username já em uso
   */
  async accept(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.invitationRepo.findOne({ where: { token } });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('INVITATION_EXPIRED');

    const openInvite = this.isOpenInvite(invitation);

    if (!openInvite) {
      if (invitation.acceptedAt) throw new BadRequestException('INVITATION_ALREADY_ACCEPTED');
    } else {
      if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
        throw new BadRequestException('INVITATION_USES_EXHAUSTED');
      }
    }

    const existingUsername = await this.memberRepo.findOne({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('USERNAME_TAKEN');

    // Determine email: from invite (email-based) or from DTO (open invite)
    const memberEmail = openInvite ? (dto.email ?? null) : invitation.email;

    if (memberEmail) {
      const emailTaken = await this.memberRepo.findOne({ where: { email: memberEmail } });
      if (emailTaken) throw new ConflictException('EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepo.create({
      name: dto.name,
      email: memberEmail as string,
      username: dto.username,
      passwordHash,
      mustChangePassword: false,
      isAdmin: invitation.role === 'admin',
      avatarUrl: (dto.avatarUrl || null) as string,
    });
    const savedMember: TeamMember = await this.memberRepo.save(member);

    const ms = this.membershipRepo.create({
      orgId: invitation.orgId,
      memberId: savedMember.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    });
    await this.membershipRepo.save(ms);

    // For email-based invites: mark as accepted. For open invites: increment counter.
    if (!openInvite) {
      await this.invitationRepo.update(invitation.id, { acceptedAt: new Date() });
    } else {
      await this.invitationRepo.update(invitation.id, { useCount: invitation.useCount + 1 });
    }

    const payload = {
      sub: savedMember.id,
      username: savedMember.username,
      orgId: invitation.orgId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      must_change_password: false,
      user: {
        id: savedMember.id,
        name: savedMember.name,
        username: savedMember.username,
        avatarUrl: savedMember.avatarUrl || null,
        isAdmin: savedMember.isAdmin,
        orgId: invitation.orgId,
      },
    };
  }

  private isOpenInvite(invitation: Invitation): boolean {
    return invitation.email === null;
  }
}
