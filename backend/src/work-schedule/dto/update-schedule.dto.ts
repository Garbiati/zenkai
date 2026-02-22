import { IsOptional, Matches } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato deve ser HH:MM' })
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato deve ser HH:MM' })
  lunchStart?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato deve ser HH:MM' })
  lunchEnd?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato deve ser HH:MM' })
  endTime?: string;
}
