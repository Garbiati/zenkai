import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamMembersService } from './team-members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('team-members')
@ApiBearerAuth()
@Controller('team-members')
@UseGuards(JwtAuthGuard)
export class TeamMembersController {
  constructor(private service: TeamMembersService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.orgId);
  }
}
