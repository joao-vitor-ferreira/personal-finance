import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransactionFiltersDto } from './dto/transaction-filters.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('Transações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Transação criada e saldos atualizados atomicamente.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Origem ou regra de domínio inválida.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, dto);
  }

  @Post('transfers')
  @ApiCreatedResponse({
    description:
      'Transferência e suas duas movimentações criadas atomicamente.',
  })
  createTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transactionsService.createTransfer(user.id, dto);
  }

  @Get()
  @ApiOkResponse({
    description: 'Página de transações e metadados de paginação.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionFiltersDto,
  ) {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Transação encontrada.' })
  @ApiNotFoundResponse({
    description: 'Transação inexistente ou de outro usuário.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Transação e impactos financeiros atualizados atomicamente.',
  })
  @ApiConflictResponse({
    description: 'Transação pertence a um agregado protegido.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Transação removida e impactos revertidos.' })
  @ApiConflictResponse({
    description: 'Transação pertence a um agregado protegido.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.remove(user.id, id);
  }
}
