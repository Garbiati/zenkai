import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(999)
  estimatedHours?: number;
}
