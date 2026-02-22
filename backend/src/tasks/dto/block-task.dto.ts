import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BlockTaskDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ActivateTaskDto {
  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  resolutionNote?: string;
}

export class ChangeOwnerDto {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;
}
