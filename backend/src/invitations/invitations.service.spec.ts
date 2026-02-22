import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { Invitation } from '../organizations/invitation.entity';
import { Organization } from '../organizations/organization.entity';
import { Membership } from '../organizations/membership.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed_pw') }));

const makeMock = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const jwtMock = { sign: jest.fn().mockReturnValue('jwt-token') };
const mailMock = { sendInvite: jest.fn().mockResolvedValue(undefined) };

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationRepo: ReturnType<typeof makeMock>;
  let orgRepo: ReturnType<typeof makeMock>;
  let membershipRepo: ReturnType<typeof makeMock>;
  let memberRepo: ReturnType<typeof makeMock>;

  beforeEach(async () => {
    invitationRepo = makeMock();
    orgRepo = makeMock();
    membershipRepo = makeMock();
    memberRepo = makeMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: invitationRepo },
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: JwtService, useValue: jwtMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  // ── findByToken ──────────────────────────────────────────────────────────
  describe('findByToken', () => {
    it('throws NotFoundException for unknown token', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      await expect(service.findByToken('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for already-accepted invite', async () => {
      invitationRepo.findOne.mockResolvedValue({
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
      await expect(service.findByToken('token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired invite', async () => {
      invitationRepo.findOne.mockResolvedValue({
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.findByToken('token')).rejects.toThrow(BadRequestException);
    });

    it('returns invite details with org name', async () => {
      invitationRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        email: 'new@test.com',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        orgId: 'org-1',
        maxUses: null,
        useCount: 0,
      });
      orgRepo.findOne.mockResolvedValue({ id: 'org-1', name: 'Test Team' });

      const result = await service.findByToken('valid-token');
      expect(result.email).toBe('new@test.com');
      expect(result.orgName).toBe('Test Team');
      expect(result.isOpenInvite).toBe(false);
    });

    it('returns open invite with isOpenInvite: true', async () => {
      invitationRepo.findOne.mockResolvedValue({
        id: 'inv-open',
        email: null,
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        orgId: 'org-1',
        maxUses: null,
        useCount: 0,
      });
      orgRepo.findOne.mockResolvedValue({ id: 'org-1', name: 'Test Team' });

      const result = await service.findByToken('open-token');
      expect(result.email).toBeNull();
      expect(result.isOpenInvite).toBe(true);
    });

    it('throws BadRequestException when open invite uses exhausted', async () => {
      invitationRepo.findOne.mockResolvedValue({
        id: 'inv-open',
        email: null,
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        orgId: 'org-1',
        maxUses: 5,
        useCount: 5,
      });

      await expect(service.findByToken('exhausted-token')).rejects.toThrow(BadRequestException);
    });
  });

  // ── accept ───────────────────────────────────────────────────────────────
  describe('accept', () => {
    const validInvite = {
      id: 'inv-1',
      email: 'new@test.com',
      role: 'member' as const,
      orgId: 'org-1',
      invitedBy: 'owner-id',
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null,
      maxUses: null,
      useCount: 0,
    };

    const openInvite = {
      id: 'inv-open',
      email: null,
      role: 'member' as const,
      orgId: 'org-1',
      invitedBy: 'owner-id',
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null,
      maxUses: null,
      useCount: 0,
    };

    const dto = { name: 'New User', username: 'n.user', password: 'Password1' };

    it('throws NotFoundException for unknown token', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      await expect(service.accept('bad', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if already accepted (email-based)', async () => {
      invitationRepo.findOne.mockResolvedValue({ ...validInvite, acceptedAt: new Date() });
      await expect(service.accept('token', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if username taken', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvite);
      memberRepo.findOne.mockResolvedValue({ id: 'other' });
      await expect(service.accept('token', dto)).rejects.toThrow(ConflictException);
    });

    it('creates member + membership and returns JWT with orgId on success', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvite);
      memberRepo.findOne.mockResolvedValue(null); // username available
      const newMember = {
        id: 'new-id',
        name: dto.name,
        username: dto.username,
        avatarUrl: null,
        isAdmin: false,
      };
      memberRepo.create.mockReturnValue(newMember);
      memberRepo.save.mockResolvedValue(newMember);
      membershipRepo.create.mockReturnValue({});
      membershipRepo.save.mockResolvedValue({});
      invitationRepo.update.mockResolvedValue({});

      const result = await service.accept('token', dto);

      expect(memberRepo.save).toHaveBeenCalledTimes(1);
      expect(membershipRepo.save).toHaveBeenCalledTimes(1);
      expect(invitationRepo.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ acceptedAt: expect.any(Date) }),
      );
      expect(result.access_token).toBe('jwt-token');
      expect(result.must_change_password).toBe(false);
      expect(result.user.orgId).toBe('org-1');
    });

    it('accepts open invite: increments useCount instead of setting acceptedAt', async () => {
      invitationRepo.findOne.mockResolvedValue(openInvite);
      memberRepo.findOne.mockResolvedValue(null);
      const newMember = {
        id: 'new-id',
        name: dto.name,
        username: dto.username,
        avatarUrl: null,
        isAdmin: false,
      };
      memberRepo.create.mockReturnValue(newMember);
      memberRepo.save.mockResolvedValue(newMember);
      membershipRepo.create.mockReturnValue({});
      membershipRepo.save.mockResolvedValue({});
      invitationRepo.update.mockResolvedValue({});

      await service.accept('open-token', dto);

      expect(invitationRepo.update).toHaveBeenCalledWith(
        'inv-open',
        expect.objectContaining({ useCount: 1 }),
      );
    });

    it('throws BadRequestException when open invite uses are exhausted', async () => {
      invitationRepo.findOne.mockResolvedValue({ ...openInvite, maxUses: 3, useCount: 3 });
      await expect(service.accept('token', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    const inviterId = 'owner-id';
    const dto = { email: 'invite@test.com' as string | undefined };

    it('throws NotFoundException if inviter has no membership', async () => {
      membershipRepo.findOne.mockResolvedValue(null);
      await expect(service.create(inviterId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if inviter is a regular member', async () => {
      membershipRepo.findOne.mockResolvedValue({ orgId: 'org-1', role: 'member' });
      await expect(service.create(inviterId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if plan member limit reached', async () => {
      membershipRepo.findOne.mockResolvedValue({ orgId: 'org-1', role: 'owner' });
      orgRepo.findOneOrFail.mockResolvedValue({ id: 'org-1', plan: 'free' });
      membershipRepo.count.mockResolvedValue(7); // free plan limit
      await expect(service.create(inviterId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if email already registered', async () => {
      membershipRepo.findOne.mockResolvedValue({ orgId: 'org-1', role: 'admin' });
      orgRepo.findOneOrFail.mockResolvedValue({ id: 'org-1', plan: 'free' });
      membershipRepo.count.mockResolvedValue(3);
      memberRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create(inviterId, dto)).rejects.toThrow(ConflictException);
    });

    it('creates and returns invite on success', async () => {
      membershipRepo.findOne.mockResolvedValue({ orgId: 'org-1', role: 'owner' });
      orgRepo.findOneOrFail.mockResolvedValue({ id: 'org-1', plan: 'free' });
      membershipRepo.count.mockResolvedValue(3);
      memberRepo.findOne.mockResolvedValue(null); // email not taken
      invitationRepo.findOne.mockResolvedValue(null); // no pending invite
      const saved = {
        id: 'inv-new',
        email: dto.email,
        role: 'member',
        expiresAt: new Date(),
        token: 'uuid-token',
        maxUses: null,
        useCount: 0,
      };
      invitationRepo.create.mockReturnValue(saved);
      invitationRepo.save.mockResolvedValue(saved);

      const result = await service.create(inviterId, dto);
      expect(result.email).toBe(dto.email);
      expect(result.token).toBe('uuid-token');
      expect(result.inviteLink).toContain('/invite/uuid-token');
    });

    it('creates open invite (no email) with expiresIn and maxUses', async () => {
      membershipRepo.findOne.mockResolvedValue({ orgId: 'org-1', role: 'owner' });
      orgRepo.findOneOrFail.mockResolvedValue({ id: 'org-1', plan: 'free' });
      membershipRepo.count.mockResolvedValue(2);
      const saved = {
        id: 'inv-open',
        email: null,
        role: 'member',
        expiresAt: new Date(),
        token: 'open-token',
        maxUses: 10,
        useCount: 0,
      };
      invitationRepo.create.mockReturnValue(saved);
      invitationRepo.save.mockResolvedValue(saved);

      const result = await service.create(inviterId, { expiresIn: '24h', maxUses: 10 });
      expect(result.email).toBeNull();
      expect(result.maxUses).toBe(10);
      expect(result.inviteLink).toContain('/invite/open-token');
    });
  });
});
