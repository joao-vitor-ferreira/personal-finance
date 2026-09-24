import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateInstallmentDto } from './dto/create-installment.dto.js';
import { InstallmentsService } from './installments.service.js';

@ApiTags('Parcelamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Compra e parcelas criadas atomicamente.',
  })
  @ApiConflictResponse({ description: 'Uma fatura de destino já está paga.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInstallmentDto,
  ) {
    return this.installmentsService.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Compras parceladas do usuário.' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.installmentsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Compra parcelada e suas parcelas.' })
  @ApiNotFoundResponse({
    description: 'Compra inexistente ou de outro usuário.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.installmentsService.findOne(user.id, id);
  }
}
