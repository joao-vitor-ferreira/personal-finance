import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { addUtcMonths, parseDateOnly } from '../common/date/date-only.js';
import {
  CategoryType,
  InvoiceStatus,
  Prisma,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma/client.js';
import { InvoiceResolverService } from '../invoices/invoice-resolver.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateInstallmentDto } from './dto/create-installment.dto.js';

const installmentInclude = {
  creditCard: true,
  category: true,
  transactions: {
    include: { invoice: true },
    orderBy: { installmentNumber: 'asc' as const },
  },
} as const;

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceResolver: InvoiceResolverService,
  ) {}

  async create(userId: string, dto: CreateInstallmentDto) {
    const groupId = await this.prisma.$transaction(async (database) => {
      const creditCard = await database.creditCard.findFirst({
        where: { id: dto.creditCardId, userId, isActive: true },
        select: { id: true, closingDay: true, dueDay: true },
      });

      if (!creditCard) {
        throw new NotFoundException('Cartão de crédito não encontrado.');
      }

      if (dto.categoryId) {
        const category = await database.category.findFirst({
          where: {
            id: dto.categoryId,
            userId,
            isActive: true,
            type: { in: [CategoryType.EXPENSE, CategoryType.BOTH] },
          },
          select: { id: true },
        });

        if (!category) {
          throw new NotFoundException('Categoria de despesa não encontrada.');
        }
      }

      const totalAmount = new Prisma.Decimal(dto.totalAmount.toString());
      const installmentAmounts = this.splitAmount(
        totalAmount,
        dto.totalInstallments,
      );
      const purchaseDate = parseDateOnly(dto.purchaseDate);
      const group = await database.installmentGroup.create({
        data: {
          userId,
          creditCardId: creditCard.id,
          categoryId: dto.categoryId,
          description: dto.description.trim(),
          totalAmount,
          totalInstallments: dto.totalInstallments,
          purchaseDate,
        },
      });
      const invoiceTotals = new Map<string, Prisma.Decimal>();
      const transactions: Prisma.TransactionCreateManyInput[] = [];

      for (let index = 0; index < dto.totalInstallments; index += 1) {
        const transactionDate = addUtcMonths(purchaseDate, index);
        const invoice = await this.invoiceResolver.findOrCreateForUpdate(
          database,
          creditCard,
          transactionDate,
        );

        if (invoice.status === InvoiceStatus.PAID) {
          throw new ConflictException(
            'Uma das parcelas seria vinculada a uma fatura já paga.',
          );
        }

        const amount = installmentAmounts[index];
        transactions.push({
          userId,
          creditCardId: creditCard.id,
          invoiceId: invoice.id,
          categoryId: dto.categoryId,
          description: `${dto.description.trim()} (${index + 1}/${dto.totalInstallments})`,
          amount,
          transactionDate,
          type: TransactionType.EXPENSE,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
          installmentGroupId: group.id,
          installmentNumber: index + 1,
          totalInstallments: dto.totalInstallments,
        });

        const current = invoiceTotals.get(invoice.id) ?? new Prisma.Decimal(0);
        invoiceTotals.set(invoice.id, current.plus(amount));
      }

      await database.transaction.createMany({ data: transactions });

      for (const [invoiceId, amount] of invoiceTotals) {
        const result = await database.invoice.updateMany({
          where: {
            id: invoiceId,
            creditCard: { userId },
            status: { not: InvoiceStatus.PAID },
          },
          data: { totalAmount: { increment: amount } },
        });

        if (result.count !== 1) {
          throw new ConflictException(
            'Uma fatura de destino foi paga durante a criação das parcelas.',
          );
        }
      }

      return group.id;
    });

    return this.findOne(userId, groupId);
  }

  findAll(userId: string) {
    return this.prisma.installmentGroup.findMany({
      where: { userId },
      include: installmentInclude,
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const group = await this.prisma.installmentGroup.findFirst({
      where: { id, userId },
      include: installmentInclude,
    });

    if (!group) {
      throw new NotFoundException('Compra parcelada não encontrada.');
    }

    return group;
  }

  private splitAmount(
    totalAmount: Prisma.Decimal,
    count: number,
  ): Prisma.Decimal[] {
    const totalCents = BigInt(totalAmount.times(100).toFixed(0));
    const installmentCount = BigInt(count);

    if (totalCents < installmentCount) {
      throw new UnprocessableEntityException(
        'O total deve permitir ao menos R$ 0,01 por parcela.',
      );
    }

    const baseCents = totalCents / installmentCount;
    const remainderCents = totalCents % installmentCount;

    return Array.from({ length: count }, (_value, index) => {
      const cents =
        index === count - 1 ? baseCents + remainderCents : baseCents;
      return new Prisma.Decimal(cents.toString()).dividedBy(100);
    });
  }
}
