import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9._-]+$/, { message: 'USERNAME_INVALID_FORMAT' })
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatarUrl?: string;

  /** Fornecido pelo usuário ao aceitar um open invite (quando convite não tem email). */
  @IsOptional()
  @IsEmail({}, { message: 'EMAIL_INVALID' })
  email?: string;
}
