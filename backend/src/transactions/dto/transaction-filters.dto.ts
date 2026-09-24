import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date-only.validator.js';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/client.js';

export enum TransactionSortField {
  TRANSACTION_DATE = 'transactionDate',
  AMOUNT = 'amount',
  DESCRIPTION = 'description',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class TransactionFiltersDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  creditCardId?: string;

  @ApiPropertyOptional({ example: 'ifood' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: TransactionSortField,
    default: TransactionSortField.TRANSACTION_DATE,
  })
  @IsOptional()
  @IsEnum(TransactionSortField)
  sortBy = TransactionSortField.TRANSACTION_DATE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder = SortOrder.DESC;
}
