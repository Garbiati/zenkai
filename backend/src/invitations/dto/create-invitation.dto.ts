import { IsEmail, IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { MembershipRole } from '../../organizations/membership.entity';

export class CreateInvitationDto {
  @IsOptional()
  @IsEmail({}, { message: 'EMAIL_INVALID' })
  email?: string;

  @IsOptional()
  @IsEnum(['member', 'admin'], { message: 'ROLE_INVALID' })
  role?: MembershipRole;

  /** Tempo de expiração. Padrão: '7d'. */
  @IsOptional()
  @IsIn(['1h', '24h', '7d', 'never'], { message: 'EXPIRES_IN_INVALID' })
  expiresIn?: '1h' | '24h' | '7d' | 'never';

  /** Máximo de usos. NULL = ilimitado. */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
