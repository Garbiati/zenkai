import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';

// Mock bcrypt at module level to avoid "Cannot redefine property" errors
// with newer bcrypt versions that have non-configurable function properties.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';
import { TeamMember } from '../team-members/team-member.entity';
import { Membership } from '../organizations/membership.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from './dto/register.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMember = (overrides: Partial<TeamMember> = {}): TeamMember =>
  ({
    id: 'member-1',
    name: 'Alessandro Garbiati',
    username: 'a.garbiati',
    passwordHash: '$2b$10$hashedpassword', // mocked hash
    mustChangePassword: false,
    isAdmin: true,
    avatarUrl: null,
    updatedBy: null,
    ...overrides,
  }) as unknown as TeamMember;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let memberRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let membershipRepo: { findOne: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let dataSource: { query: jest.Mock };
  let orgsService: {
    createWithOwner: jest.Mock;
  };

  beforeEach(async () => {
    memberRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    membershipRepo = { findOne: jest.fn().mockResolvedValue({ orgId: 'org-1' }) };
    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
    dataSource = { query: jest.fn() };
    orgsService = { createWithOwner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
        { provide: OrganizationsService, useValue: orgsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------

  describe('login', () => {
    it('should return access_token and user info on valid credentials', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('a.garbiati', 'ValidPass1');

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.username).toBe('a.garbiati');
      expect(result.must_change_password).toBe(false);
      expect(result.user.orgId).toBe('org-1');
    });

    it('should include orgId: null when member has no membership', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      membershipRepo.findOne.mockResolvedValue(null);

      const result = await service.login('a.garbiati', 'ValidPass1');

      expect(result.user.orgId).toBeNull();
    });

    it('should throw UnauthorizedException for unknown username', async () => {
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(service.login('unknown', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('a.garbiati', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include must_change_password flag in response', async () => {
      const member = makeMember({ mustChangePassword: true });
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('a.garbiati', 'ValidPass1');

      expect(result.must_change_password).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // changePassword()
  // -------------------------------------------------------------------------

  describe('changePassword', () => {
    it('should change password and clear mustChangePassword flag', async () => {
      const member = makeMember({ mustChangePassword: true });
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      memberRepo.save.mockResolvedValue({ ...member, mustChangePassword: false });

      const result = await service.changePassword('member-1', 'OldPass1', 'NewPass2024A');

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(member.mustChangePassword).toBe(false);
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for wrong current password', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('member-1', 'WrongCurrent1', 'NewPass2024A'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is too short (< 8 chars)', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword('member-1', 'Current1', 'Short1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when new password has no uppercase', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('member-1', 'Current1', 'nouppercase123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password has no number', async () => {
      const member = makeMember();
      const qbMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(member),
      };
      memberRepo.createQueryBuilder.mockReturnValue(qbMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword('member-1', 'Current1', 'NoNumberPass')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getProfile()
  // -------------------------------------------------------------------------

  describe('getProfile', () => {
    it('should return member profile without sensitive fields', async () => {
      // Simulate TypeORM select option: only the selected fields are returned
      const { passwordHash: _omitted, ...profileFields } = makeMember() as any;
      memberRepo.findOne.mockResolvedValue(profileFields);

      const result = await service.getProfile('member-1');

      expect(result.id).toBe('member-1');
      expect(result.username).toBe('a.garbiati');
      // passwordHash should never appear in result
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // register()
  // @see ADR 0007 — Self-registration flow
  // -------------------------------------------------------------------------

  describe('register', () => {
    const validDto: RegisterDto = {
      email: 'new@example.com',
      name: 'New User',
      username: 'new.user',
      password: 'ValidPass1',
      teamName: 'My Team',
    };

    const savedMember = makeMember({
      id: 'new-member-id',
      name: 'New User',
      username: 'new.user',
      mustChangePassword: false,
      isAdmin: false,
    });

    it('should create member + org and return access_token with orgId', async () => {
      memberRepo.findOne.mockResolvedValue(null); // no duplicates
      memberRepo.create.mockReturnValue(savedMember);
      memberRepo.save.mockResolvedValue(savedMember);
      orgsService.createWithOwner.mockResolvedValue({ id: 'org-1', name: 'My Team' });

      const result = await service.register(validDto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.must_change_password).toBe(false);
      expect(result.user.username).toBe('new.user');
      expect(result.user.orgId).toBe('org-1');
      expect(result.user.isAdmin).toBe(false);
      expect(orgsService.createWithOwner).toHaveBeenCalledWith('My Team', 'new-member-id');
    });

    it('should use "Name\'s Team" as org name when teamName is omitted', async () => {
      const dto = { ...validDto, teamName: undefined };
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(savedMember);
      memberRepo.save.mockResolvedValue(savedMember);
      orgsService.createWithOwner.mockResolvedValue({ id: 'org-1', name: "New User's Team" });

      await service.register(dto);

      expect(orgsService.createWithOwner).toHaveBeenCalledWith("New User's Team", 'new-member-id');
    });

    it('should throw ConflictException when email is already taken', async () => {
      memberRepo.findOne.mockImplementation(({ where }) => {
        if (where.email === validDto.email) return Promise.resolve(makeMember());
        return Promise.resolve(null);
      });

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username is already taken', async () => {
      memberRepo.findOne.mockImplementation(({ where }) => {
        if (where.username === validDto.username) return Promise.resolve(makeMember());
        return Promise.resolve(null);
      });

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when password is too short', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.register({ ...validDto, password: 'Short1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when password has no uppercase', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.register({ ...validDto, password: 'nouppercase1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when password has no number', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.register({ ...validDto, password: 'NoNumberPass' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set mustChangePassword to false (user chose their own password)', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(savedMember);
      memberRepo.save.mockResolvedValue(savedMember);
      orgsService.createWithOwner.mockResolvedValue({ id: 'org-1' });

      const result = await service.register(validDto);

      expect(result.must_change_password).toBe(false);
    });
  });
});
