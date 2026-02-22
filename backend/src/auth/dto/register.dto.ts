import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Payload para self-registration de novos usuários.
 * @see POST /auth/register
 * @see ADR 0007 — Multi-tenancy: self-registration flow
 */
export class RegisterDto {
  @IsEmail({}, { message: 'EMAIL_INVALID' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'NAME_TOO_SHORT' })
  @MaxLength(100, { message: 'NAME_TOO_LONG' })
  name: string;

  @IsString()
  @MinLength(3, { message: 'USERNAME_TOO_SHORT' })
  @MaxLength(50, { message: 'USERNAME_TOO_LONG' })
  @Matches(/^[a-z0-9._-]+$/, { message: 'USERNAME_INVALID_FORMAT' })
  username: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  password: string;

  /** Nome do time. Se omitido, usa "Nome's Team". */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'TEAM_NAME_TOO_LONG' })
  teamName?: string;
}
