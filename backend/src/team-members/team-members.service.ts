import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from './team-member.entity';
import { Membership } from '../organizations/membership.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
  ) {}

  async findAll(orgId: string | null) {
    if (!orgId) {
      return this.memberRepo.find({
        select: ['id', 'name', 'username', 'avatarUrl'],
        order: { name: 'ASC' },
      });
    }

    return this.memberRepo
      .createQueryBuilder('m')
      .innerJoin(Membership, 'ms', 'ms.memberId = m.id AND ms.orgId = :orgId', { orgId })
      .select(['m.id', 'm.name', 'm.username', 'm.avatarUrl'])
      .orderBy('m.name', 'ASC')
      .getMany();
  }

  async findOne(id: string) {
    return this.memberRepo.findOne({
      where: { id },
      select: ['id', 'name', 'username', 'avatarUrl'],
    });
  }
}
