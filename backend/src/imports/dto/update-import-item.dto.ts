import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { TransactionType } from '../../generated/prisma/client.js';

export class UpdateImportItemDto {
  @ApiPropertyOptional({ example: 'Restaurante' })
  @IsOptional()
  @IsString()
  @IsNonBlank()
  @MinLength(1)
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 89.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_000_000_000_000)
  amount?: number;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-24' })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsDateOnly()
  transactionDate?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;
}
