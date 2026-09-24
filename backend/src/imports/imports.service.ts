import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/date/date-only.js';
import { isUniqueConstraintError } from '../common/prisma/prisma-errors.js';
import {
  CategoryType,
  ImportItemStatus,
  ImportStatus,
  InvoiceStatus,
  Prisma,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma/client.js';
import { InvoiceResolverService } from '../invoices/invoice-resolver.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { matchRuleCategory } from '../rules/rule-matcher.js';
import { RulesService } from '../rules/rules.service.js';
import { parseCsvRows, type ParsedCsvRow } from './csv-parser.js';
import {
  deduplicationBase,
  sha256,
  transactionDeduplicationHash,
} from './deduplication.js';
import type { ConfirmImportDto } from './dto/confirm-import.dto.js';
import type { ImportPreviewDto } from './dto/import-preview.dto.js';
import type { UpdateImportItemDto } from './dto/update-import-item.dto.js';

const MAX_CSV_ROWS = 500;

type DatabaseClient = Prisma.TransactionClient;

interface OwnedImportTarget {
  key: string;
  accountId?: string;
  creditCard?: {
    id: string;
    closingDay: number;
    dueDay: number;
  };
}

const importInclude = {
  account: true,
  creditCard: true,
  items: {
    include: { category: true, transaction: true },
    orderBy: { rowNumber: 'asc' },
  },
} satisfies Prisma.ImportBatchInclude;

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
    private readonly invoiceResolver: InvoiceResolverService,
  ) {}

  async previewCsv(
    userId: string,
    dto: ImportPreviewDto,
    file: Express.Multer.File | undefined,
  ) {
    this.validateFile(file);
    const safeFile = file;
    let rows: ParsedCsvRow[];

    try {
      rows = parseCsvRows(safeFile.buffer, dto.delimiter);
    } catch {
      throw new UnprocessableEntityException(
        'Não foi possível interpretar o CSV. Verifique cabeçalho, delimitador e aspas.',
      );
    }

    if (rows.length === 0) {
      throw new UnprocessableEntityException('O CSV não possui transações.');
    }
    if (rows.length > MAX_CSV_ROWS) {
      throw new UnprocessableEntityException(
        `O CSV excede o limite de ${MAX_CSV_ROWS} linhas.`,
      );
    }

    const fileHash = sha256(safeFile.buffer);
    const rules = await this.rulesService.findActiveForMatching(userId);

    try {
      const batchId = await this.prisma.$transaction(async (database) => {
        const target = await this.assertOwnedTarget(database, userId, dto);
        const previousBatch = await database.importBatch.findFirst({
          where: { userId, fileHash },
          select: { id: true, status: true },
        });

        if (previousBatch) {
          throw new ConflictException(
            `Este arquivo já foi enviado na importação ${previousBatch.id} (${previousBatch.status}).`,
          );
        }

        const occurrences = new Map<string, number>();
        const prepared = rows.map((row) => {
          if (
            row.validationErrors.length > 0 ||
            !row.amount ||
            !row.transactionDate ||
            !row.type
          ) {
            return {
              ...row,
              categoryId: null,
              occurrenceIndex: 0,
              deduplicationHash: null,
              status: ImportItemStatus.INVALID,
            };
          }

          const input = {
            userId,
            target: target.key,
            description: row.description,
            amount: row.amount,
            transactionDate: row.transactionDate,
            type: row.type,
            externalId: row.externalId,
          };
          const base = deduplicationBase(input);
          const occurrenceIndex = occurrences.get(base) ?? 0;
          occurrences.set(base, occurrenceIndex + 1);

          return {
            ...row,
            categoryId: matchRuleCategory(rules, row.description, row.type),
            occurrenceIndex,
            deduplicationHash: transactionDeduplicationHash(
              input,
              occurrenceIndex,
            ),
            status: ImportItemStatus.READY,
          };
        });
        const hashes = prepared.flatMap((item) =>
          item.deduplicationHash ? [item.deduplicationHash] : [],
        );
        const duplicates = await database.transaction.findMany({
          where: { userId, deduplicationHash: { in: hashes } },
          select: { deduplicationHash: true },
        });
        const duplicateHashes = new Set(
          duplicates.flatMap((item) =>
            item.deduplicationHash ? [item.deduplicationHash] : [],
          ),
        );

        const batch = await database.importBatch.create({
          data: {
            userId,
            accountId: target.accountId,
            creditCardId: target.creditCard?.id,
            originalFileName: safeFile.originalname.slice(0, 255),
            fileHash,
            rowCount: rows.length,
            items: {
              create: prepared.map((item) => ({
                rowNumber: item.rowNumber,
                description: item.description,
                amount: item.amount,
                transactionDate: item.transactionDate,
                type: item.type,
                categoryId: item.categoryId,
                externalId: item.externalId,
                occurrenceIndex: item.occurrenceIndex,
                deduplicationHash: item.deduplicationHash,
                status:
                  item.deduplicationHash &&
                  duplicateHashes.has(item.deduplicationHash)
                    ? ImportItemStatus.DUPLICATE
                    : item.status,
                validationErrors: item.validationErrors,
              })),
            },
          },
          select: { id: true },
        });
        return batch.id;
      });

      return this.findOne(userId, batchId);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Este arquivo já foi enviado anteriormente.',
        );
      }
      throw error;
    }
  }

  async findOne(userId: string, id: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id, userId },
      include: importInclude,
    });

    if (!batch) {
      throw new NotFoundException('Importação não encontrada.');
    }

    return batch;
  }

  async updateItem(
    userId: string,
    batchId: string,
    itemId: string,
    dto: UpdateImportItemDto,
  ) {
    return this.prisma.$transaction(async (database) => {
      const candidate = await database.importBatch.findFirst({
        where: { id: batchId, userId },
        select: { id: true },
      });
      if (!candidate) {
        throw new NotFoundException('Importação não encontrada.');
      }
      await this.lockImportBatch(database, candidate.id);
      const batch = await database.importBatch.findFirst({
        where: {
          id: candidate.id,
          userId,
          status: ImportStatus.PREVIEWED,
        },
        include: { items: { where: { id: itemId } } },
      });

      if (!batch) {
        throw new ConflictException(
          'A importação não está mais disponível para revisão.',
        );
      }
      const item = batch.items[0];
      if (!item) {
        throw new NotFoundException('Item da importação não encontrado.');
      }

      const description = dto.description?.trim() ?? item.description;
      const amount = dto.amount
        ? new Prisma.Decimal(dto.amount.toString())
        : item.amount;
      const transactionDate = dto.transactionDate
        ? parseDateOnly(dto.transactionDate)
        : item.transactionDate;
      const type = dto.type ?? item.type;
      const categoryId = dto.categoryId ?? item.categoryId;
      const externalId =
        dto.externalId === undefined
          ? item.externalId
          : dto.externalId.trim() || null;
      const validationErrors: string[] = [];
      const previousErrors = Array.isArray(item.validationErrors)
        ? item.validationErrors.filter(
            (error): error is string => typeof error === 'string',
          )
        : [];

      if (dto.description === undefined) {
        validationErrors.push(
          ...previousErrors.filter((error) => error.startsWith('Descrição')),
        );
      }

      if (!description) validationErrors.push('Descrição ausente.');
      if (!amount || amount.lessThanOrEqualTo(0))
        validationErrors.push('Valor inválido.');
      if (!transactionDate) validationErrors.push('Data inválida.');
      if (!type || type === TransactionType.TRANSFER)
        validationErrors.push('Tipo inválido para importação.');

      if (categoryId && type) {
        await this.assertOwnedCategory(database, userId, categoryId, type);
      }

      const target = batch.accountId
        ? `account:${batch.accountId}`
        : `credit-card:${batch.creditCardId}`;
      const deduplicationHash =
        validationErrors.length === 0 && amount && transactionDate && type
          ? transactionDeduplicationHash(
              {
                userId,
                target,
                description,
                amount,
                transactionDate,
                type,
                externalId,
              },
              item.occurrenceIndex,
            )
          : null;
      const duplicate = deduplicationHash
        ? await database.transaction.findFirst({
            where: { userId, deduplicationHash },
            select: { id: true },
          })
        : null;

      return database.importItem.update({
        where: { id: item.id },
        data: {
          description,
          amount,
          transactionDate,
          type,
          categoryId,
          externalId,
          deduplicationHash,
          status: duplicate
            ? ImportItemStatus.DUPLICATE
            : validationErrors.length > 0
              ? ImportItemStatus.INVALID
              : ImportItemStatus.READY,
          validationErrors,
        },
        include: { category: true },
      });
    });
  }

  async confirm(userId: string, id: string, dto: ConfirmImportDto) {
    try {
      const batchId = await this.prisma.$transaction(
        async (database) => {
          const ownedBatch = await database.importBatch.findFirst({
            where: { id, userId },
            select: { id: true },
          });
          if (!ownedBatch) {
            throw new NotFoundException('Importação não encontrada.');
          }
          const claimed = await database.importBatch.updateMany({
            where: {
              id: ownedBatch.id,
              userId,
              status: ImportStatus.PREVIEWED,
            },
            data: { status: ImportStatus.PROCESSING },
          });
          if (claimed.count !== 1) {
            throw new ConflictException(
              'A importação já foi confirmada, cancelada ou está em processamento.',
            );
          }
          const batch = await database.importBatch.findFirstOrThrow({
            where: {
              id: ownedBatch.id,
              userId,
              status: ImportStatus.PROCESSING,
            },
            include: { items: { orderBy: { rowNumber: 'asc' } } },
          });

          const selectedIds = dto.itemIds ? new Set(dto.itemIds) : null;
          if (
            selectedIds &&
            batch.items.filter((item) => selectedIds.has(item.id)).length !==
              selectedIds.size
          ) {
            throw new UnprocessableEntityException(
              'Um ou mais itens selecionados não pertencem à importação.',
            );
          }
          const selected = batch.items.filter(
            (item) =>
              item.status === ImportItemStatus.READY &&
              (!selectedIds || selectedIds.has(item.id)),
          );
          if (selectedIds && selected.length !== selectedIds.size) {
            throw new UnprocessableEntityException(
              'Somente itens com status READY podem ser confirmados.',
            );
          }

          const target = await this.assertOwnedTarget(database, userId, {
            accountId: batch.accountId ?? undefined,
            creditCardId: batch.creditCardId ?? undefined,
          });
          let importedCount = 0;

          for (const item of selected) {
            if (
              !item.amount ||
              !item.transactionDate ||
              !item.type ||
              !item.deduplicationHash
            ) {
              throw new UnprocessableEntityException(
                `O item ${item.id} não está completamente normalizado.`,
              );
            }

            const existing = await database.transaction.findFirst({
              where: { userId, deduplicationHash: item.deduplicationHash },
              select: { id: true },
            });
            if (existing) {
              await database.importItem.update({
                where: { id: item.id },
                data: { status: ImportItemStatus.DUPLICATE },
              });
              continue;
            }

            if (item.categoryId) {
              await this.assertOwnedCategory(
                database,
                userId,
                item.categoryId,
                item.type,
              );
            }

            let invoiceId: string | undefined;
            if (target.creditCard) {
              const invoice = await this.invoiceResolver.findOrCreateForUpdate(
                database,
                target.creditCard,
                item.transactionDate,
              );
              if (invoice.status === InvoiceStatus.PAID) {
                throw new ConflictException(
                  'Uma transação seria incluída em fatura já paga.',
                );
              }
              invoiceId = invoice.id;
            }

            const transaction = await database.transaction.create({
              data: {
                userId,
                accountId: target.accountId,
                creditCardId: target.creditCard?.id,
                invoiceId,
                categoryId: item.categoryId,
                description: item.description,
                amount: item.amount,
                transactionDate: item.transactionDate,
                type: item.type,
                direction:
                  item.type === TransactionType.INCOME
                    ? TransactionDirection.CREDIT
                    : TransactionDirection.DEBIT,
                status: TransactionStatus.COMPLETED,
                externalId: item.externalId,
                deduplicationHash: item.deduplicationHash,
              },
            });

            if (target.accountId) {
              const delta =
                item.type === TransactionType.INCOME
                  ? item.amount
                  : item.amount.negated();
              await database.account.updateMany({
                where: { id: target.accountId, userId },
                data: { currentBalance: { increment: delta } },
              });
            } else if (invoiceId) {
              const delta =
                item.type === TransactionType.EXPENSE
                  ? item.amount
                  : item.amount.negated();
              const updatedInvoice = await database.invoice.updateMany({
                where: {
                  id: invoiceId,
                  creditCard: { userId },
                  status: { not: InvoiceStatus.PAID },
                },
                data: { totalAmount: { increment: delta } },
              });
              if (updatedInvoice.count !== 1) {
                throw new ConflictException(
                  'Uma fatura de destino foi paga durante a importação.',
                );
              }
            }

            await database.importItem.update({
              where: { id: item.id },
              data: {
                status: ImportItemStatus.IMPORTED,
                transactionId: transaction.id,
              },
            });
            importedCount += 1;
          }

          const completed = await database.importBatch.updateMany({
            where: {
              id: batch.id,
              userId,
              status: ImportStatus.PROCESSING,
            },
            data: {
              status: ImportStatus.CONFIRMED,
              importedCount,
              confirmedAt: new Date(),
            },
          });
          if (completed.count !== 1) {
            throw new ConflictException(
              'A importação perdeu a reserva de processamento.',
            );
          }

          return batch.id;
        },
        { timeout: 30_000 },
      );

      return this.findOne(userId, batchId);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Uma transação desta importação já foi persistida por outra operação.',
        );
      }
      throw error;
    }
  }

  async cancel(userId: string, id: string) {
    const result = await this.prisma.importBatch.updateMany({
      where: { id, userId, status: ImportStatus.PREVIEWED },
      data: { status: ImportStatus.CANCELLED },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Importação não encontrada ou não pode mais ser cancelada.',
      );
    }

    return { id, status: ImportStatus.CANCELLED };
  }

  private async lockImportBatch(
    database: DatabaseClient,
    batchId: string,
  ): Promise<void> {
    await database.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ImportBatch"
      WHERE "id" = ${batchId}::uuid
      FOR UPDATE
    `;
  }

  private validateFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) throw new BadRequestException('O arquivo CSV é obrigatório.');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new UnprocessableEntityException(
        'A primeira versão aceita somente arquivos .csv.',
      );
    }
  }

  private async assertOwnedTarget(
    database: DatabaseClient,
    userId: string,
    input: { accountId?: string; creditCardId?: string },
  ): Promise<OwnedImportTarget> {
    if (Boolean(input.accountId) === Boolean(input.creditCardId)) {
      throw new BadRequestException(
        'Informe exatamente um destino: accountId ou creditCardId.',
      );
    }

    if (input.accountId) {
      const account = await database.account.findFirst({
        where: { id: input.accountId, userId, isActive: true },
        select: { id: true },
      });
      if (!account) throw new NotFoundException('Conta não encontrada.');
      return { key: `account:${account.id}`, accountId: account.id };
    }

    const creditCard = await database.creditCard.findFirst({
      where: { id: input.creditCardId, userId, isActive: true },
      select: { id: true, closingDay: true, dueDay: true },
    });
    if (!creditCard) {
      throw new NotFoundException('Cartão de crédito não encontrado.');
    }

    return {
      key: `credit-card:${creditCard.id}`,
      creditCard,
    };
  }

  private async assertOwnedCategory(
    database: DatabaseClient,
    userId: string,
    categoryId: string,
    type: TransactionType,
  ): Promise<void> {
    const types =
      type === TransactionType.INCOME
        ? [CategoryType.INCOME, CategoryType.BOTH]
        : [CategoryType.EXPENSE, CategoryType.BOTH];
    const category = await database.category.findFirst({
      where: { id: categoryId, userId, isActive: true, type: { in: types } },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoria não encontrada ou incompatível com o tipo.',
      );
    }
  }
}
