import { Controller, Get, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('work-schedule')
@ApiBearerAuth()
@Controller('work-schedule')
@UseGuards(JwtAuthGuard)
export class WorkScheduleController {
  constructor(private service: WorkScheduleService) {}

  @Get()
  getMySchedule(@Request() req) {
    return this.service.getEffectiveSchedule(req.user.sub);
  }

  @Get('global')
  getGlobal() {
    return this.service.getGlobalSchedule();
  }

  @Put('global')
  updateGlobal(@Body() dto: UpdateScheduleDto, @Request() req) {
    return this.service.updateGlobal(dto, req.user.sub);
  }

  @Put('mine')
  updateMine(@Body() dto: UpdateScheduleDto, @Request() req) {
    return this.service.updateMine(req.user.sub, dto);
  }

  @Delete('mine')
  deleteMine(@Request() req) {
    return this.service.deleteMine(req.user.sub);
  }
}
