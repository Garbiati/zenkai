import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSchedule } from './work-schedule.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class WorkScheduleService {
  constructor(
    @InjectRepository(WorkSchedule)
    private scheduleRepo: Repository<WorkSchedule>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
  ) {}

  async getGlobalSchedule(): Promise<WorkSchedule> {
    let schedule = await this.scheduleRepo
      .createQueryBuilder('ws')
      .where('ws.member_id IS NULL')
      .getOne();
    if (!schedule) {
      schedule = this.scheduleRepo.create({
        memberId: null,
        startTime: '08:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        endTime: '17:00',
      });
      schedule = await this.scheduleRepo.save(schedule);
    }
    return schedule;
  }

  async getEffectiveSchedule(memberId: string): Promise<WorkSchedule> {
    const personal = await this.scheduleRepo.findOne({
      where: { memberId },
    });
    if (personal) return personal;
    return this.getGlobalSchedule();
  }

  async updateGlobal(dto: UpdateScheduleDto, userId: string): Promise<WorkSchedule> {
    const member = await this.memberRepo.findOne({ where: { id: userId } });
    if (!member?.isAdmin) {
      throw new ForbiddenException('Apenas administradores podem alterar a escala global');
    }

    let schedule = await this.scheduleRepo
      .createQueryBuilder('ws')
      .where('ws.member_id IS NULL')
      .getOne();

    if (!schedule) {
      schedule = this.scheduleRepo.create({ memberId: null });
    }

    if (dto.startTime !== undefined) schedule.startTime = dto.startTime;
    if (dto.lunchStart !== undefined) schedule.lunchStart = dto.lunchStart;
    if (dto.lunchEnd !== undefined) schedule.lunchEnd = dto.lunchEnd;
    if (dto.endTime !== undefined) schedule.endTime = dto.endTime;

    return this.scheduleRepo.save(schedule);
  }

  async updateMine(memberId: string, dto: UpdateScheduleDto): Promise<WorkSchedule> {
    let schedule = await this.scheduleRepo.findOne({
      where: { memberId },
    });

    if (!schedule) {
      schedule = this.scheduleRepo.create({ memberId });
    }

    if (dto.startTime !== undefined) schedule.startTime = dto.startTime;
    if (dto.lunchStart !== undefined) schedule.lunchStart = dto.lunchStart;
    if (dto.lunchEnd !== undefined) schedule.lunchEnd = dto.lunchEnd;
    if (dto.endTime !== undefined) schedule.endTime = dto.endTime;

    return this.scheduleRepo.save(schedule);
  }

  async deleteMine(memberId: string): Promise<void> {
    await this.scheduleRepo.delete({ memberId });
  }

  calculateExpectedHours(schedule: WorkSchedule): number {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const morning = toMinutes(schedule.lunchStart) - toMinutes(schedule.startTime);
    const afternoon = toMinutes(schedule.endTime) - toMinutes(schedule.lunchEnd);
    return (morning + afternoon) / 60;
  }
}
