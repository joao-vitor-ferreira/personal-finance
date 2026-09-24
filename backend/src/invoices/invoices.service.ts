import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/date/date-only.js';
import { isUniqueConstraintError } from '../common/prisma/prisma-errors.js';
import { InvoiceStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { InvoiceResolverService } from './invoice-resolver.service.js';

const invoiceInclude = {
  creditCard: true,
  payment: { include: { account: true } },
  transactions: {
    include: { category: true },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceResolver: InvoiceResolverService,
  ) {}

  async findByCreditCard(userId: string, creditCardId: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
      select: { id: true },
    });

    if (!card) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    return this.prisma.invoice.findMany({
      where: { creditCardId: card.id, creditCard: { userId } },
      include: invoiceInclude,
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, creditCard: { userId } },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada.');
    }

    return invoice;
  }

  async pay(userId: string, id: string, dto: PayInvoiceDto) {
    try {
      const paidInvoiceId = await this.prisma.$transaction(async (database) => {
        const candidate = await database.invoice.findFirst({
          where: { id, creditCard: { userId } },
          select: { id: true },
        });

        if (!candidate) {
          throw new NotFoundException('Fatura não encontrada.');
        }

        await this.invoiceResolver.lockForUpdate(database, candidate.id);
        const invoice = await database.invoice.findUniqueOrThrow({
          where: { id: candidate.id },
          include: { payment: true },
        });

        if (invoice.status === InvoiceStatus.PAID || invoice.payment) {
          throw new ConflictException('Esta fatura já foi paga.');
        }

        if (invoice.totalAmount.lessThanOrEqualTo(0)) {
          throw new UnprocessableEntityException(
            'A fatura não possui valor positivo para pagamento.',
          );
        }

        const account = await database.account.findFirst({
          where: { id: dto.accountId, userId, isActive: true },
          select: { id: true },
        });

        if (!account) {
          throw new NotFoundException('Conta para pagamento não encontrada.');
        }

        const paidAt = dto.paidAt
          ? parseDateOnly(dto.paidAt)
          : parseDateOnly(new Date().toISOString().slice(0, 10));

        await database.invoicePayment.create({
          data: {
            userId,
            invoiceId: invoice.id,
            accountId: account.id,
            amount: invoice.totalAmount,
            paidAt,
          },
        });
        await database.account.updateMany({
          where: { id: account.id, userId },
          data: {
            currentBalance: { decrement: invoice.totalAmount },
          },
        });
        const updatedInvoice = await database.invoice.updateMany({
          where: {
            id: invoice.id,
            creditCard: { userId },
            status: { not: InvoiceStatus.PAID },
          },
          data: {
            status: InvoiceStatus.PAID,
            paidAmount: invoice.totalAmount,
          },
        });
        if (updatedInvoice.count !== 1) {
          throw new ConflictException('Esta fatura já foi paga.');
        }

        return invoice.id;
      });

      return this.findOne(userId, paidInvoiceId);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Esta fatura já foi paga.');
      }

      throw error;
    }
  }
}
