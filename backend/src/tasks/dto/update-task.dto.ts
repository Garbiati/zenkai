import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(999)
  estimatedHours?: number;
}
