import { BadRequestException, Injectable } from '@nestjs/common';
import { parseDateOnly } from '../common/date/date-only.js';
import { decimalToApiNumber } from '../common/money/money.js';
import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, filter: DashboardFilterDto) {
    const where = this.transactionWhere(userId, filter);
    const grouped = await this.prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });
    const income =
      grouped.find((item) => item.type === TransactionType.INCOME)?._sum
        .amount ?? new Prisma.Decimal(0);
    const expense =
      grouped.find((item) => item.type === TransactionType.EXPENSE)?._sum
        .amount ?? new Prisma.Decimal(0);

    return {
      income: decimalToApiNumber(income),
      expense: decimalToApiNumber(expense),
      balance: decimalToApiNumber(income.minus(expense)),
    };
  }

  async monthly(userId: string, filter: DashboardFilterDto) {
    const transactions = await this.prisma.transaction.findMany({
      where: this.transactionWhere(userId, filter),
      select: { transactionDate: true, type: true, amount: true },
      orderBy: { transactionDate: 'asc' },
    });
    const months = new Map<
      string,
      { income: Prisma.Decimal; expense: Prisma.Decimal }
    >();

    for (const transaction of transactions) {
      const month = transaction.transactionDate.toISOString().slice(0, 7);
      const current = months.get(month) ?? {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      };
      if (transaction.type === TransactionType.INCOME) {
        current.income = current.income.plus(transaction.amount);
      } else {
        current.expense = current.expense.plus(transaction.amount);
      }
      months.set(month, current);
    }

    return [...months.entries()].map(([month, totals]) => ({
      month,
      income: decimalToApiNumber(totals.income),
      expense: decimalToApiNumber(totals.expense),
      balance: decimalToApiNumber(totals.income.minus(totals.expense)),
    }));
  }

  async categories(userId: string, filter: DashboardFilterDto) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: this.transactionWhere(userId, filter),
      _sum: { amount: true },
      _count: { _all: true },
    });
    const categoryIds = grouped.flatMap((item) =>
      item.categoryId ? [item.categoryId] : [],
    );
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, userId },
      select: { id: true, name: true, color: true, icon: true },
    });
    const categoriesById = new Map(categories.map((item) => [item.id, item]));
    const response = grouped.map((item) => ({
      category: item.categoryId
        ? (categoriesById.get(item.categoryId) ?? null)
        : null,
      categoryName: item.categoryId
        ? (categoriesById.get(item.categoryId)?.name ?? 'Categoria removida')
        : 'Sem categoria',
      amount: decimalToApiNumber(item._sum.amount ?? new Prisma.Decimal(0)),
      count: item._count._all,
    }));

    return {
      income: response.filter(
        (_item, index) => grouped[index].type === TransactionType.INCOME,
      ),
      expense: response.filter(
        (_item, index) => grouped[index].type === TransactionType.EXPENSE,
      ),
    };
  }

  private transactionWhere(
    userId: string,
    filter: DashboardFilterDto,
  ): Prisma.TransactionWhereInput {
    if (
      filter.startDate &&
      filter.endDate &&
      filter.startDate > filter.endDate
    ) {
      throw new BadRequestException(
        'startDate deve ser anterior ou igual a endDate.',
      );
    }

    const now = new Date();
    const defaultStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const defaultEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    );

    return {
      userId,
      status: TransactionStatus.COMPLETED,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      transactionDate: {
        gte: filter.startDate ? parseDateOnly(filter.startDate) : defaultStart,
        lte: filter.endDate ? parseDateOnly(filter.endDate) : defaultEnd,
      },
    };
  }
}
