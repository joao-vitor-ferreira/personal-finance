import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class PayInvoiceDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Conta debitada pelo valor integral da fatura.',
  })
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-24' })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsDateOnly()
  paidAt?: string;
}
