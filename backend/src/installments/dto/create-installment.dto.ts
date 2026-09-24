import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';

export class CreateInstallmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creditCardId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 'Notebook' })
  @IsString()
  @IsNonBlank()
  @MinLength(1)
  @MaxLength(245)
  description: string;

  @ApiProperty({ example: 3600 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_000_000_000_000)
  totalAmount: number;

  @ApiProperty({ example: 12, minimum: 2, maximum: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(120)
  totalInstallments: number;

  @ApiProperty({ example: '2026-09-24', format: 'date' })
  @IsDateString({ strict: true })
  @IsDateOnly()
  purchaseDate: string;
}
