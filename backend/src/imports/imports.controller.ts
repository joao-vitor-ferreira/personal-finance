import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ConfirmImportDto } from './dto/confirm-import.dto.js';
import { ImportPreviewDto } from './dto/import-preview.dto.js';
import { UpdateImportItemDto } from './dto/update-import-item.dto.js';
import { ImportsService } from './imports.service.js';

@ApiTags('Importações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('csv/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        accountId: { type: 'string', format: 'uuid' },
        creditCardId: { type: 'string', format: 'uuid' },
        delimiter: { type: 'string', enum: [',', ';'] },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Preview persistido; nenhuma transação foi criada.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Arquivo inválido ou fora dos limites.',
  })
  previewCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportPreviewDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.importsService.previewCsv(user.id, dto, file);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Importação com itens, sugestões e status.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.importsService.findOne(user.id, id);
  }

  @Patch(':batchId/items/:itemId')
  @ApiOkResponse({ description: 'Item revisado e deduplicação recalculada.' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateImportItemDto,
  ) {
    return this.importsService.updateItem(user.id, batchId, itemId, dto);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Itens READY confirmados em uma transação de banco.',
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmImportDto,
  ) {
    return this.importsService.confirm(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Preview cancelado sem criar transações.' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.importsService.cancel(user.id, id);
  }
}
