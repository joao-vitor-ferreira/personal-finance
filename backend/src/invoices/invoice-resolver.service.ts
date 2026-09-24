import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { invoiceCycleFor } from './invoice-cycle.js';

@Injectable()
export class InvoiceResolverService {
  findOrCreate(
    database: Prisma.TransactionClient,
    creditCard: { id: string; closingDay: number; dueDay: number },
    transactionDate: Date,
  ) {
    const cycle = invoiceCycleFor(
      transactionDate,
      creditCard.closingDay,
      creditCard.dueDay,
    );

    return database.invoice.upsert({
      where: {
        creditCardId_referenceMonth_referenceYear: {
          creditCardId: creditCard.id,
          referenceMonth: cycle.referenceMonth,
          referenceYear: cycle.referenceYear,
        },
      },
      create: {
        creditCardId: creditCard.id,
        ...cycle,
      },
      update: {},
    });
  }

  async findOrCreateForUpdate(
    database: Prisma.TransactionClient,
    creditCard: { id: string; closingDay: number; dueDay: number },
    transactionDate: Date,
  ) {
    const invoice = await this.findOrCreate(
      database,
      creditCard,
      transactionDate,
    );
    await this.lockForUpdate(database, invoice.id);
    return database.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  }

  async lockForUpdate(
    database: Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<void> {
    await database.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Invoice"
      WHERE "id" = ${invoiceId}::uuid
      FOR UPDATE
    `;
  }
}
