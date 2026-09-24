import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';

export class CreateTransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceAccountId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  destinationAccountId: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_000_000_000_000)
  amount: number;

  @ApiProperty({ example: 'Transferência para reserva' })
  @IsString()
  @IsNonBlank()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: '2026-09-24', format: 'date' })
  @IsDateString({ strict: true })
  @IsDateOnly()
  transactionDate: string;
}
