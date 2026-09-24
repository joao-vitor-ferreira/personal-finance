import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreditCardsService } from './credit-cards.service.js';
import { CreateCreditCardDto } from './dto/create-credit-card.dto.js';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto.js';

@ApiTags('Cartões de crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Cartão criado sem armazenar o número completo.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCreditCardDto,
  ) {
    return this.creditCardsService.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Cartões do usuário autenticado.' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.creditCardsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Cartão encontrado.' })
  @ApiNotFoundResponse({
    description: 'Cartão inexistente ou de outro usuário.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.creditCardsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Cartão atualizado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditCardDto,
  ) {
    return this.creditCardsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Cartão desativado.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.creditCardsService.remove(user.id, id);
  }
}
