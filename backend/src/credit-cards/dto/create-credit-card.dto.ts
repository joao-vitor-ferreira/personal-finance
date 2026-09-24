import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCreditCardDto {
  @ApiProperty({ example: 'Cartão principal' })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Visa' })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(40)
  brand: string;

  @ApiProperty({ example: '1234', pattern: '^\\d{4}$' })
  @Matches(/^\d{4}$/)
  lastFourDigits: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_000_000_000_000)
  creditLimit: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay: number;

  @ApiProperty({ example: 17, minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive = true;
}
