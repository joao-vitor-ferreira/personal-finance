import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/date/date-only.js';
import {
  paginationArgs,
  paginationMeta,
} from '../common/pagination/pagination.js';
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
import type { CreateTransactionDto } from './dto/create-transaction.dto.js';
import type { CreateTransferDto } from './dto/create-transfer.dto.js';
import {
  SortOrder,
  TransactionSortField,
  type TransactionFiltersDto,
} from './dto/transaction-filters.dto.js';
import type { UpdateTransactionDto } from './dto/update-transaction.dto.js';

type DatabaseClient = Prisma.TransactionClient;

interface TransactionReferences {
  accountId?: string;
  creditCardId?: string;
  invoiceId?: string;
  categoryId?: string;
}

interface ReferenceInput extends TransactionReferences {
  type: TransactionType;
  transactionDate: Date;
}

const transactionInclude = {
  account: true,
  creditCard: true,
  invoice: true,
  category: true,
} as const;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceResolver: InvoiceResolverService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.type === TransactionType.TRANSFER) {
      throw new UnprocessableEntityException(
        'Use o endpoint de transferências para esse tipo de movimentação.',
      );
    }

    const transactionId = await this.prisma.$transaction(async (database) => {
      const transactionDate = parseDateOnly(dto.transactionDate);
      const amount = new Prisma.Decimal(dto.amount.toString());
      const references = await this.resolveReferences(database, userId, {
        accountId: dto.accountId,
        creditCardId: dto.creditCardId,
        invoiceId: dto.invoiceId,
        categoryId: dto.categoryId,
        type: dto.type,
        transactionDate,
      });

      const transaction = await database.transaction.create({
        data: {
          userId,
          ...references,
          description: dto.description.trim(),
          amount,
          transactionDate,
          type: dto.type,
          direction: this.directionFor(dto.type),
          status: dto.status,
          notes: dto.notes?.trim(),
          externalId: dto.externalId?.trim(),
        },
      });

      await this.applyImpacts(
        database,
        userId,
        references,
        dto.type,
        dto.status,
        amount,
      );

      return transaction.id;
    });

    return this.findOne(userId, transactionId);
  }

  async createTransfer(userId: string, dto: CreateTransferDto) {
    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException(
        'As contas de origem e destino devem ser diferentes.',
      );
    }

    const transferId = await this.prisma.$transaction(async (database) => {
      const accounts = await database.account.findMany({
        where: {
          id: { in: [dto.sourceAccountId, dto.destinationAccountId] },
          userId,
          isActive: true,
        },
        select: { id: true },
      });

      if (accounts.length !== 2) {
        throw new NotFoundException(
          'Conta de origem ou destino não encontrada.',
        );
      }

      const amount = new Prisma.Decimal(dto.amount.toString());
      const transactionDate = parseDateOnly(dto.transactionDate);
      const transfer = await database.transfer.create({
        data: {
          userId,
          sourceAccountId: dto.sourceAccountId,
          destinationAccountId: dto.destinationAccountId,
          amount,
          description: dto.description.trim(),
          transactionDate,
          status: TransactionStatus.COMPLETED,
        },
      });
      await database.transaction.createMany({
        data: [
          {
            userId,
            accountId: dto.sourceAccountId,
            transferId: transfer.id,
            description: dto.description.trim(),
            amount,
            transactionDate,
            type: TransactionType.TRANSFER,
            direction: TransactionDirection.DEBIT,
            status: TransactionStatus.COMPLETED,
          },
          {
            userId,
            accountId: dto.destinationAccountId,
            transferId: transfer.id,
            description: dto.description.trim(),
            amount,
            transactionDate,
            type: TransactionType.TRANSFER,
            direction: TransactionDirection.CREDIT,
            status: TransactionStatus.COMPLETED,
          },
        ],
      });

      await this.updateAccountBalance(
        database,
        userId,
        dto.sourceAccountId,
        amount.negated(),
      );
      await this.updateAccountBalance(
        database,
        userId,
        dto.destinationAccountId,
        amount,
      );

      return transfer.id;
    });

    return this.prisma.transfer.findFirstOrThrow({
      where: { id: transferId, userId },
      include: { transactions: { orderBy: { direction: 'asc' } } },
    });
  }

  async findAll(userId: string, query: TransactionFiltersDto) {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException(
        'startDate deve ser anterior ou igual a endDate.',
      );
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      type: query.type,
      status: query.status,
      categoryId: query.categoryId,
      accountId: query.accountId,
      creditCardId: query.creditCardId,
      description: query.search?.trim()
        ? { contains: query.search.trim(), mode: 'insensitive' }
        : undefined,
      transactionDate:
        query.startDate || query.endDate
          ? {
              gte: query.startDate ? parseDateOnly(query.startDate) : undefined,
              lte: query.endDate ? parseDateOnly(query.endDate) : undefined,
            }
          : undefined,
    };
    const orderBy = this.orderBy(query.sortBy, query.sortOrder);
    const pagination = paginationArgs(query.page, query.limit);
    const data = await this.prisma.transaction.findMany({
      where,
      ...pagination,
      include: transactionInclude,
      orderBy: [orderBy, { id: query.sortOrder }],
    });
    const total = await this.prisma.transaction.count({ where });

    return {
      data,
      meta: paginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    if (dto.type === TransactionType.TRANSFER) {
      throw new UnprocessableEntityException(
        'Transferências não podem ser criadas por este endpoint.',
      );
    }

    const transactionId = await this.prisma.$transaction(async (database) => {
      const existing = await this.findOwnedForUpdate(database, userId, id);

      if (
        existing.deduplicationHash &&
        (dto.accountId !== undefined ||
          dto.creditCardId !== undefined ||
          dto.invoiceId !== undefined ||
          dto.description !== undefined ||
          dto.amount !== undefined ||
          dto.transactionDate !== undefined ||
          dto.type !== undefined ||
          dto.externalId !== undefined)
      ) {
        throw new ConflictException(
          'Campos que compõem a deduplicação de uma transação importada são imutáveis.',
        );
      }

      if (existing.invoiceId) {
        await this.assertInvoiceIsMutable(database, userId, existing.invoiceId);
      }

      if (existing.transferId || existing.installmentGroupId) {
        throw new ConflictException(
          'Movimentações de transferência ou parcelamento devem ser alteradas pelo agregado de origem.',
        );
      }

      if (dto.accountId && dto.creditCardId) {
        throw new BadRequestException(
          'Informe somente accountId ou creditCardId.',
        );
      }

      const accountId = dto.accountId
        ? dto.accountId
        : dto.creditCardId
          ? undefined
          : (existing.accountId ?? undefined);
      const creditCardId = dto.creditCardId
        ? dto.creditCardId
        : dto.accountId
          ? undefined
          : (existing.creditCardId ?? undefined);
      const type = dto.type ?? existing.type;
      const status = dto.status ?? existing.status;
      const transactionDate = dto.transactionDate
        ? parseDateOnly(dto.transactionDate)
        : existing.transactionDate;
      const amount = dto.amount
        ? new Prisma.Decimal(dto.amount.toString())
        : existing.amount;
      const references = await this.resolveReferences(database, userId, {
        accountId,
        creditCardId,
        invoiceId: dto.accountId
          ? undefined
          : (dto.invoiceId ??
            (!dto.creditCardId && !dto.transactionDate
              ? (existing.invoiceId ?? undefined)
              : undefined)),
        categoryId: dto.categoryId ?? existing.categoryId ?? undefined,
        type,
        transactionDate,
      });

      await this.reverseImpacts(database, userId, existing);
      await this.applyImpacts(
        database,
        userId,
        references,
        type,
        status,
        amount,
      );

      return database.transaction.update({
        where: { id },
        data: {
          accountId: references.accountId ?? null,
          creditCardId: references.creditCardId ?? null,
          invoiceId: references.invoiceId ?? null,
          categoryId: references.categoryId ?? null,
          description: dto.description?.trim(),
          amount,
          transactionDate,
          type,
          direction: this.directionFor(type),
          status,
          notes: dto.notes?.trim(),
          externalId: dto.externalId?.trim(),
        },
        include: transactionInclude,
      });
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.$transaction(async (database) => {
      const existing = await this.findOwnedForUpdate(database, userId, id);

      if (existing.invoiceId) {
        await this.assertInvoiceIsMutable(database, userId, existing.invoiceId);
      }

      if (existing.transferId || existing.installmentGroupId) {
        throw new ConflictException(
          'Movimentações de transferência ou parcelamento devem ser removidas pelo agregado de origem.',
        );
      }

      await this.reverseImpacts(database, userId, existing);
      await database.transaction.delete({ where: { id } });
      return { id, deleted: true };
    });
  }

  private async resolveReferences(
    database: DatabaseClient,
    userId: string,
    input: ReferenceInput,
  ): Promise<TransactionReferences> {
    const hasAccount = Boolean(input.accountId);
    const hasCreditCard = Boolean(input.creditCardId);

    if (hasAccount === hasCreditCard) {
      throw new UnprocessableEntityException(
        'Informe exatamente uma origem: accountId ou creditCardId.',
      );
    }

    if (input.type === TransactionType.TRANSFER) {
      throw new UnprocessableEntityException(
        'Use o endpoint de transferências para esse tipo de movimentação.',
      );
    }

    if (input.categoryId) {
      const acceptedTypes =
        input.type === TransactionType.INCOME
          ? [CategoryType.INCOME, CategoryType.BOTH]
          : [CategoryType.EXPENSE, CategoryType.BOTH];
      const category = await database.category.findFirst({
        where: {
          id: input.categoryId,
          userId,
          isActive: true,
          type: { in: acceptedTypes },
        },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException(
          'Categoria não encontrada ou incompatível com o tipo da transação.',
        );
      }
    }

    if (input.accountId) {
      if (input.invoiceId) {
        throw new BadRequestException(
          'invoiceId só pode ser usado em uma transação de cartão.',
        );
      }

      const account = await database.account.findFirst({
        where: { id: input.accountId, userId, isActive: true },
        select: { id: true },
      });

      if (!account) {
        throw new NotFoundException('Conta não encontrada.');
      }

      return {
        accountId: account.id,
        categoryId: input.categoryId,
      };
    }

    const creditCard = await database.creditCard.findFirst({
      where: { id: input.creditCardId, userId, isActive: true },
      select: { id: true, closingDay: true, dueDay: true },
    });

    if (!creditCard) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    let invoice;
    if (input.invoiceId) {
      const candidate = await database.invoice.findFirst({
        where: {
          id: input.invoiceId,
          creditCardId: creditCard.id,
          creditCard: { userId },
        },
        select: { id: true },
      });
      if (!candidate) {
        throw new NotFoundException('Fatura não encontrada para este cartão.');
      }
      await this.invoiceResolver.lockForUpdate(database, candidate.id);
      invoice = await database.invoice.findUniqueOrThrow({
        where: { id: candidate.id },
      });
    } else {
      invoice = await this.invoiceResolver.findOrCreateForUpdate(
        database,
        creditCard,
        input.transactionDate,
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException(
        'Não é possível incluir uma transação em uma fatura paga.',
      );
    }

    return {
      creditCardId: creditCard.id,
      invoiceId: invoice.id,
      categoryId: input.categoryId,
    };
  }

  private async applyImpacts(
    database: DatabaseClient,
    userId: string,
    references: TransactionReferences,
    type: TransactionType,
    status: TransactionStatus,
    amount: Prisma.Decimal,
  ): Promise<void> {
    if (references.accountId) {
      const delta = this.accountDelta(type, status, amount);
      if (!delta.isZero()) {
        await this.updateAccountBalance(
          database,
          userId,
          references.accountId,
          delta,
        );
      }
    }

    if (references.invoiceId) {
      const delta = this.invoiceDelta(type, status, amount);
      if (!delta.isZero()) {
        await this.updateInvoiceTotal(
          database,
          userId,
          references.invoiceId,
          delta,
        );
      }
    }
  }

  private async reverseImpacts(
    database: DatabaseClient,
    userId: string,
    transaction: {
      accountId: string | null;
      invoiceId: string | null;
      type: TransactionType;
      status: TransactionStatus;
      amount: Prisma.Decimal;
    },
  ): Promise<void> {
    if (transaction.accountId) {
      const delta = this.accountDelta(
        transaction.type,
        transaction.status,
        transaction.amount,
      );
      if (!delta.isZero()) {
        await this.updateAccountBalance(
          database,
          userId,
          transaction.accountId,
          delta.negated(),
        );
      }
    }

    if (transaction.invoiceId) {
      const delta = this.invoiceDelta(
        transaction.type,
        transaction.status,
        transaction.amount,
      );
      if (!delta.isZero()) {
        await this.updateInvoiceTotal(
          database,
          userId,
          transaction.invoiceId,
          delta.negated(),
        );
      }
    }
  }

  private accountDelta(
    type: TransactionType,
    status: TransactionStatus,
    amount: Prisma.Decimal,
  ): Prisma.Decimal {
    if (status !== TransactionStatus.COMPLETED) {
      return new Prisma.Decimal(0);
    }

    return type === TransactionType.INCOME ? amount : amount.negated();
  }

  private invoiceDelta(
    type: TransactionType,
    status: TransactionStatus,
    amount: Prisma.Decimal,
  ): Prisma.Decimal {
    if (status === TransactionStatus.CANCELLED) {
      return new Prisma.Decimal(0);
    }

    return type === TransactionType.EXPENSE ? amount : amount.negated();
  }

  private async updateAccountBalance(
    database: DatabaseClient,
    userId: string,
    accountId: string,
    delta: Prisma.Decimal,
  ): Promise<void> {
    const result = await database.account.updateMany({
      where: { id: accountId, userId },
      data: { currentBalance: { increment: delta } },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Conta não encontrada.');
    }
  }

  private async updateInvoiceTotal(
    database: DatabaseClient,
    userId: string,
    invoiceId: string,
    delta: Prisma.Decimal,
  ): Promise<void> {
    const result = await database.invoice.updateMany({
      where: {
        id: invoiceId,
        creditCard: { userId },
        status: { not: InvoiceStatus.PAID },
      },
      data: { totalAmount: { increment: delta } },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'A fatura foi paga e não pode mais ser alterada.',
      );
    }
  }

  private async findOwnedForUpdate(
    database: DatabaseClient,
    userId: string,
    transactionId: string,
  ) {
    const candidate = await database.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException('Transação não encontrada.');
    }

    await database.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Transaction"
      WHERE "id" = ${candidate.id}::uuid
      FOR UPDATE
    `;
    return database.transaction.findFirstOrThrow({
      where: { id: candidate.id, userId },
    });
  }

  private async assertInvoiceIsMutable(
    database: DatabaseClient,
    userId: string,
    invoiceId: string,
  ): Promise<void> {
    const candidate = await database.invoice.findFirst({
      where: { id: invoiceId, creditCard: { userId } },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException('Fatura não encontrada.');
    }

    await this.invoiceResolver.lockForUpdate(database, candidate.id);
    const invoice = await database.invoice.findUniqueOrThrow({
      where: { id: candidate.id },
      select: { status: true },
    });
    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException(
        'Transações de uma fatura paga não podem ser alteradas ou removidas.',
      );
    }
  }

  private directionFor(type: TransactionType): TransactionDirection {
    return type === TransactionType.INCOME
      ? TransactionDirection.CREDIT
      : TransactionDirection.DEBIT;
  }

  private orderBy(
    field: TransactionSortField,
    order: SortOrder,
  ): Prisma.TransactionOrderByWithRelationInput {
    if (field === TransactionSortField.AMOUNT) return { amount: order };
    if (field === TransactionSortField.DESCRIPTION)
      return { description: order };
    if (field === TransactionSortField.CREATED_AT) return { createdAt: order };
    return { transactionDate: order };
  }
}
