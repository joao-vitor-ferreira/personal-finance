import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import { IsDateString, IsOptional } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsDateOnly()
  startDate?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsDateOnly()
  endDate?: string;
}
