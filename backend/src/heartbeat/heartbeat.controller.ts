import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HeartbeatService } from './heartbeat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('heartbeat')
@ApiBearerAuth()
@Controller('heartbeat')
@UseGuards(JwtAuthGuard)
export class HeartbeatController {
  constructor(private service: HeartbeatService) {}

  @Post()
  heartbeat(@Request() req) {
    return this.service.heartbeat(req.user.sub);
  }
}
