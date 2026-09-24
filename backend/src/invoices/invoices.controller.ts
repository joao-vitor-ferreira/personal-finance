import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('Faturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('credit-cards/:creditCardId/invoices')
  @ApiOkResponse({ description: 'Faturas e transações do cartão.' })
  @ApiNotFoundResponse({
    description: 'Cartão inexistente ou de outro usuário.',
  })
  findByCreditCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
  ) {
    return this.invoicesService.findByCreditCard(user.id, creditCardId);
  }

  @Get('invoices/:id')
  @ApiOkResponse({ description: 'Fatura com cartão, transações e pagamento.' })
  @ApiNotFoundResponse({
    description: 'Fatura inexistente ou de outro usuário.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findOne(user.id, id);
  }

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Fatura paga integralmente e conta debitada.' })
  @ApiConflictResponse({ description: 'Fatura já paga.' })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.invoicesService.pay(user.id, id, dto);
  }
}
