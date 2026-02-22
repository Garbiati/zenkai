import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // S2: Strict rate limit — 5 attempts per minute to prevent brute-force
  @ApiOperation({ summary: 'Login com username + password — retorna JWT' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  // S2: Strict rate limit — prevents registration spam
  @ApiOperation({ summary: 'Auto-registro: cria organização + membro owner — retorna JWT' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Troca de senha (requer auth)' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza perfil (nome, avatar)' })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stats do perfil (tasks, horas, velocidade)' })
  @UseGuards(JwtAuthGuard)
  @Get('profile/stats')
  async getProfileStats(@Request() req) {
    return this.authService.getProfileStats(req.user.sub);
  }
}
