import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/client.js';

export class CreateTransactionDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Obrigatório para movimentação em conta.',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Obrigatório para movimentação no cartão.',
  })
  @IsOptional()
  @IsUUID()
  creditCardId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Fatura explícita; se omitida, será calculada.',
  })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 'Supermercado' })
  @IsString()
  @IsNonBlank()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 125.5 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_000_000_000_000)
  amount: number;

  @ApiProperty({ example: '2026-09-24', format: 'date' })
  @IsDateString({ strict: true })
  @IsDateOnly()
  transactionDate: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status = TransactionStatus.COMPLETED;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @IsNonBlank()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  externalId?: string;
}
