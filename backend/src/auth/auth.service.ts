import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TeamMember } from '../team-members/team-member.entity';
import { Membership } from '../organizations/membership.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private organizationsService: OrganizationsService,
  ) {}

  async login(username: string, password: string) {
    const member = await this.memberRepo
      .createQueryBuilder('m')
      .addSelect('m.passwordHash')
      .where('m.username = :username', { username })
      .getOne();
    if (!member) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const membership = await this.membershipRepo.findOne({ where: { memberId: member.id } });
    const orgId = membership?.orgId ?? null;

    const payload = { sub: member.id, username: member.username, orgId };
    return {
      access_token: this.jwtService.sign(payload),
      must_change_password: member.mustChangePassword,
      user: {
        id: member.id,
        name: member.name,
        username: member.username,
        avatarUrl: member.avatarUrl || null,
        isAdmin: member.isAdmin,
        orgId,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const member = await this.memberRepo
      .createQueryBuilder('m')
      .addSelect('m.passwordHash')
      .where('m.id = :id', { id: userId })
      .getOne();
    if (!member) throw new UnauthorizedException('USER_NOT_FOUND');

    const valid = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!valid) throw new BadRequestException('CURRENT_PASSWORD_INCORRECT');

    this.validatePasswordStrength(newPassword);

    member.passwordHash = await bcrypt.hash(newPassword, 10);
    member.mustChangePassword = false;
    member.updatedBy = userId;
    await this.memberRepo.save(member);

    return { message: 'Senha alterada com sucesso' };
  }

  async getProfile(userId: string) {
    const member = await this.memberRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'username', 'avatarUrl', 'mustChangePassword', 'isAdmin'],
    });
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    return member;
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    const member = await this.memberRepo.findOne({ where: { id: userId } });
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    if (data.name !== undefined) member.name = data.name;
    if (data.avatarUrl !== undefined) member.avatarUrl = data.avatarUrl;
    member.updatedBy = userId;
    return this.memberRepo.save(member);
  }

  async getProfileStats(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const calcHours = async (since: Date) => {
      const result = await this.dataSource.query(
        `SELECT COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - GREATEST(started_at, $2::timestamp)))
        ), 0) as total_seconds
        FROM task_time_entries
        WHERE team_member_id = $1
          AND COALESCE(ended_at, NOW()) > $2::timestamp`,
        [userId, since],
      );
      return Math.round((parseFloat(result[0].total_seconds) / 3600) * 100) / 100;
    };

    const [hoursToday, hoursWeek, hoursMonth] = await Promise.all([
      calcHours(startOfDay),
      calcHours(startOfWeek),
      calcHours(startOfMonth),
    ]);

    const taskCounts = await this.dataSource.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'in_progress' AND owner_id = $1 AND deleted_at IS NULL) as active_tasks,
        COUNT(*) FILTER (WHERE status = 'done' AND owner_id = $1 AND deleted_at IS NULL) as done_tasks,
        COUNT(*) FILTER (WHERE owner_id = $1 AND deleted_at IS NULL) as total_tasks
      FROM tasks`,
      [userId],
    );

    return {
      hoursToday,
      hoursWeek,
      hoursMonth,
      activeTasks: parseInt(taskCounts[0].active_tasks) || 0,
      doneTasks: parseInt(taskCounts[0].done_tasks) || 0,
      totalTasks: parseInt(taskCounts[0].total_tasks) || 0,
    };
  }

  /**
   * Registra um novo usuário e cria sua organização automaticamente.
   * O primeiro membro de uma org sempre é criado como owner e isAdmin.
   * @param dto - Dados de registro validados pelo RegisterDto
   * @returns JWT token + dados do usuário (mesmo formato do login)
   * @throws ConflictException se email ou username já existem
   * @throws BadRequestException se a senha não atende aos critérios
   * @see ADR 0007 — Self-registration flow
   */
  async register(dto: RegisterDto) {
    const emailTaken = await this.memberRepo.findOne({ where: { email: dto.email } });
    if (emailTaken) throw new ConflictException('EMAIL_TAKEN');

    const usernameTaken = await this.memberRepo.findOne({ where: { username: dto.username } });
    if (usernameTaken) throw new ConflictException('USERNAME_TAKEN');

    this.validatePasswordStrength(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepo.create({
      name: dto.name,
      email: dto.email,
      username: dto.username,
      passwordHash,
      mustChangePassword: false,
      isAdmin: false,
    });
    const savedMember = await this.memberRepo.save(member);

    const teamName = dto.teamName || `${dto.name}'s Team`;
    const org = await this.organizationsService.createWithOwner(teamName, savedMember.id);

    const payload = { sub: savedMember.id, username: savedMember.username, orgId: org.id };
    return {
      access_token: this.jwtService.sign(payload),
      must_change_password: false,
      user: {
        id: savedMember.id,
        name: savedMember.name,
        username: savedMember.username,
        avatarUrl: savedMember.avatarUrl || null,
        isAdmin: false,
        orgId: org.id,
      },
    };
  }

  private validatePasswordStrength(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('PASSWORD_MIN_CHARS');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('PASSWORD_NEEDS_UPPERCASE');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('PASSWORD_NEEDS_NUMBER');
    }
  }
}
