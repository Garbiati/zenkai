import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /** Cria convite — requer auth (owner ou admin da org) */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria convite (email-based ou open invite)' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(req.user.sub, dto);
  }

  /** Busca detalhes do convite pelo token (público — página de aceite) */
  @ApiOperation({ summary: 'Busca detalhes do convite pelo token (público)' })
  @Get(':token')
  async findByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token);
  }

  /** Aceita convite — cria conta + membership + retorna JWT */
  // S2: Strict rate limit — prevents invite token abuse
  @ApiOperation({ summary: 'Aceita convite: cria conta + membership + retorna JWT' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':token/accept')
  async accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(token, dto);
  }
}
