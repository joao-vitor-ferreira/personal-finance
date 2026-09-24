import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CategoryType } from '../../generated/prisma/client.js';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Pets', minLength: 2, maxLength: 80 })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiPropertyOptional({ example: 'paw' })
  @IsOptional()
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  icon?: string;
}
