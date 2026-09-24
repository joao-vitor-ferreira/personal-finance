import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { DEFAULT_CATEGORIES } from '../src/categories/default-categories.js';
import { addUtcMonths, parseDateOnly } from '../src/common/date/date-only.js';
import {
  CategoryType,
  Prisma,
  PrismaClient,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../src/generated/prisma/client.js';
import { invoiceCycleFor } from '../src/invoices/invoice-cycle.js';

const SEED_EMAIL = 'dev@finance.local';
const SEED_PASSWORD = 'DevPassword123!';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL é obrigatória para executar o seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    create: {
      name: 'Usuário de Desenvolvimento',
      email: SEED_EMAIL,
      passwordHash,
    },
    update: {
      name: 'Usuário de Desenvolvimento',
      passwordHash,
    },
  });

  await prisma.$transaction(async (database) => {
    await database.importBatch.deleteMany({ where: { userId: user.id } });
    await database.invoicePayment.deleteMany({ where: { userId: user.id } });
    await database.transaction.deleteMany({ where: { userId: user.id } });
    await database.transfer.deleteMany({ where: { userId: user.id } });
    await database.installmentGroup.deleteMany({ where: { userId: user.id } });
    await database.invoice.deleteMany({
      where: { creditCard: { userId: user.id } },
    });
    await database.categorizationRule.deleteMany({
      where: { userId: user.id },
    });
    await database.creditCard.deleteMany({ where: { userId: user.id } });
    await database.account.deleteMany({ where: { userId: user.id } });
    await database.category.deleteMany({ where: { userId: user.id } });

    await database.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId: user.id,
        isDefault: true,
      })),
    });
    const categories = await database.category.findMany({
      where: { userId: user.id },
    });
    const categoryByName = new Map(
      categories.map((category) => [category.name, category]),
    );
    const salary = requiredCategory(categoryByName, 'Salário');
    const housing = requiredCategory(categoryByName, 'Moradia');
    const food = requiredCategory(categoryByName, 'Alimentação');
    const leisure = requiredCategory(categoryByName, 'Lazer');
    const purchases = requiredCategory(categoryByName, 'Compras');

    const checking = await database.account.create({
      data: {
        userId: user.id,
        name: 'Conta Corrente',
        type: 'CHECKING',
        initialBalance: new Prisma.Decimal('3000.00'),
        currentBalance: new Prisma.Decimal('7500.00'),
        color: '#2563EB',
      },
    });
    const savings = await database.account.create({
      data: {
        userId: user.id,
        name: 'Reserva',
        type: 'SAVINGS',
        initialBalance: new Prisma.Decimal('5000.00'),
        currentBalance: new Prisma.Decimal('6000.00'),
        color: '#16A34A',
      },
    });
    const card = await database.creditCard.create({
      data: {
        userId: user.id,
        name: 'Cartão Principal',
        brand: 'Visa',
        lastFourDigits: '4242',
        creditLimit: new Prisma.Decimal('12000.00'),
        closingDay: 10,
        dueDay: 17,
      },
    });

    await database.transaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: checking.id,
          categoryId: salary.id,
          description: 'Salário mensal',
          amount: new Prisma.Decimal('8000.00'),
          transactionDate: parseDateOnly('2026-09-01'),
          type: TransactionType.INCOME,
          direction: TransactionDirection.CREDIT,
          status: TransactionStatus.COMPLETED,
        },
        {
          userId: user.id,
          accountId: checking.id,
          categoryId: housing.id,
          description: 'Aluguel',
          amount: new Prisma.Decimal('2000.00'),
          transactionDate: parseDateOnly('2026-09-05'),
          type: TransactionType.EXPENSE,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
        },
        {
          userId: user.id,
          accountId: checking.id,
          categoryId: food.id,
          description: 'Supermercado',
          amount: new Prisma.Decimal('500.00'),
          transactionDate: parseDateOnly('2026-09-08'),
          type: TransactionType.EXPENSE,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
        },
      ],
    });

    await database.transfer.create({
      data: {
        userId: user.id,
        sourceAccountId: checking.id,
        destinationAccountId: savings.id,
        amount: new Prisma.Decimal('1000.00'),
        description: 'Aporte na reserva',
        transactionDate: parseDateOnly('2026-09-09'),
        status: TransactionStatus.COMPLETED,
        transactions: {
          create: [
            {
              userId: user.id,
              accountId: checking.id,
              description: 'Aporte na reserva',
              amount: new Prisma.Decimal('1000.00'),
              transactionDate: parseDateOnly('2026-09-09'),
              type: TransactionType.TRANSFER,
              direction: TransactionDirection.DEBIT,
              status: TransactionStatus.COMPLETED,
            },
            {
              userId: user.id,
              accountId: savings.id,
              description: 'Aporte na reserva',
              amount: new Prisma.Decimal('1000.00'),
              transactionDate: parseDateOnly('2026-09-09'),
              type: TransactionType.TRANSFER,
              direction: TransactionDirection.CREDIT,
              status: TransactionStatus.COMPLETED,
            },
          ],
        },
      },
    });

    const cashPurchaseDate = parseDateOnly('2026-09-05');
    const cashCycle = invoiceCycleFor(
      cashPurchaseDate,
      card.closingDay,
      card.dueDay,
    );
    const cashInvoice = await database.invoice.create({
      data: {
        creditCardId: card.id,
        ...cashCycle,
        totalAmount: new Prisma.Decimal('200.00'),
      },
    });
    await database.transaction.create({
      data: {
        userId: user.id,
        creditCardId: card.id,
        invoiceId: cashInvoice.id,
        categoryId: leisure.id,
        description: 'Cinema',
        amount: new Prisma.Decimal('200.00'),
        transactionDate: cashPurchaseDate,
        type: TransactionType.EXPENSE,
        direction: TransactionDirection.DEBIT,
        status: TransactionStatus.COMPLETED,
      },
    });

    const purchaseDate = parseDateOnly('2026-09-15');
    const group = await database.installmentGroup.create({
      data: {
        userId: user.id,
        creditCardId: card.id,
        categoryId: purchases.id,
        description: 'Notebook',
        totalAmount: new Prisma.Decimal('3600.00'),
        totalInstallments: 12,
        purchaseDate,
      },
    });

    for (let index = 0; index < 12; index += 1) {
      const transactionDate = addUtcMonths(purchaseDate, index);
      const cycle = invoiceCycleFor(
        transactionDate,
        card.closingDay,
        card.dueDay,
      );
      const invoice = await database.invoice.upsert({
        where: {
          creditCardId_referenceMonth_referenceYear: {
            creditCardId: card.id,
            referenceMonth: cycle.referenceMonth,
            referenceYear: cycle.referenceYear,
          },
        },
        create: {
          creditCardId: card.id,
          ...cycle,
          totalAmount: new Prisma.Decimal('300.00'),
        },
        update: {
          totalAmount: { increment: new Prisma.Decimal('300.00') },
        },
      });
      await database.transaction.create({
        data: {
          userId: user.id,
          creditCardId: card.id,
          invoiceId: invoice.id,
          categoryId: purchases.id,
          description: `Notebook (${index + 1}/12)`,
          amount: new Prisma.Decimal('300.00'),
          transactionDate,
          type: TransactionType.EXPENSE,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
          installmentGroupId: group.id,
          installmentNumber: index + 1,
          totalInstallments: 12,
        },
      });
    }

    await database.categorizationRule.create({
      data: {
        userId: user.id,
        name: 'iFood como alimentação',
        field: 'DESCRIPTION',
        operator: 'CONTAINS',
        value: 'IFOOD',
        categoryId: food.id,
        priority: 10,
      },
    });
  });

  console.log('Seed concluído.');
  console.log(`Usuário: ${SEED_EMAIL}`);
  console.log(`Senha: ${SEED_PASSWORD}`);
}

function requiredCategory(
  categories: Map<string, { id: string; name: string; type: CategoryType }>,
  name: string,
) {
  const category = categories.get(name);
  if (!category) throw new Error(`Categoria de seed não encontrada: ${name}`);
  return category;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
