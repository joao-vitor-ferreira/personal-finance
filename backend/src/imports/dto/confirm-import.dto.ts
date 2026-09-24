import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ConfirmImportDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Itens READY selecionados. Quando omitido, confirma todos os READY.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  itemIds?: string[];
}
