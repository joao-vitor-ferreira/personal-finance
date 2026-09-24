import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AccountType } from '../../generated/prisma/client.js';

export class CreateAccountDto {
  @ApiProperty({ example: 'Conta principal', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.CHECKING })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({ example: 1500.5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(-9_000_000_000_000)
  @Max(9_000_000_000_000)
  initialBalance = 0;

  @ApiPropertyOptional({ example: '#2563EB' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
