import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RuleField, RuleOperator } from '../../generated/prisma/client.js';

export class CreateRuleDto {
  @ApiProperty({ example: 'Compras no iFood' })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: RuleField, example: RuleField.DESCRIPTION })
  @IsEnum(RuleField)
  field: RuleField;

  @ApiProperty({ enum: RuleOperator, example: RuleOperator.CONTAINS })
  @IsEnum(RuleOperator)
  operator: RuleOperator;

  @ApiProperty({ example: 'IFOOD' })
  @IsString()
  @IsNonBlank()
  @MinLength(1)
  @MaxLength(255)
  value: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  caseSensitive = false;

  @ApiPropertyOptional({ default: 100, minimum: 0, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  priority = 100;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive = true;
}
