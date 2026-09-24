import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ImportPreviewDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  creditCardId?: string;

  @ApiPropertyOptional({
    enum: [',', ';'],
    description: 'Detectado automaticamente quando omitido.',
  })
  @IsOptional()
  @IsIn([',', ';'])
  delimiter?: ',' | ';';
}
