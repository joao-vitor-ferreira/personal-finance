import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Personal Finance API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA = '';
  let tokenB = '';
  let accountA = '';
  let accountB = '';
  let foodCategoryId = '';
  let cardId = '';
  let balanceBeforeImport = 0;
  const userIds: string[] = [];
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = 'senha-segura-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('registra, autentica e cria categorias padrão sem expor o hash', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);

    const registrationA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Usuário E2E A',
        email: `e2e-a-${runId}@example.com`,
        password,
      })
      .expect(201);
    const registrationB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Usuário E2E B',
        email: `e2e-b-${runId}@example.com`,
        password,
      })
      .expect(201);

    expect(registrationA.body.user.passwordHash).toBeUndefined();
    expect(registrationA.body.accessToken).toBeTypeOf('string');
    tokenA = registrationA.body.accessToken;
    tokenB = registrationB.body.accessToken;
    userIds.push(registrationA.body.user.id, registrationB.body.user.id);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Duplicado',
        email: `e2e-a-${runId}@example.com`,
        password,
      })
      .expect(409);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Senha longa em bytes',
        email: `e2e-utf8-${runId}@example.com`,
        password: 'é'.repeat(40),
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `e2e-a-${runId}@example.com`,
        password: 'senha-incorreta',
      })
      .expect(401);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `e2e-a-${runId}@example.com`, password })
      .expect(200);
    expect(login.body.accessToken).toBeTypeOf('string');

    const categories = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(categories.body).toHaveLength(11);
    foodCategoryId = categories.body.find(
      (category: { name: string }) => category.name === 'Alimentação',
    ).id;

    await request(app.getHttpServer())
      .post('/rules')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Regra inválida',
        field: 'DESCRIPTION',
        operator: 'CONTAINS',
        value: '   ',
        categoryId: foodCategoryId,
      })
      .expect(400);
  });

  it('aplica ownership, atualiza saldo e cria transferência atômica', async () => {
    const firstAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Origem E2E', type: 'CHECKING', initialBalance: 1000 })
      .expect(201);
    const secondAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Destino E2E', type: 'SAVINGS', initialBalance: 100 })
      .expect(201);
    accountA = firstAccount.body.id;
    accountB = secondAccount.body.id;

    await request(app.getHttpServer())
      .get(`/accounts/${accountA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        accountId: accountA,
        description: 'Tentativa alheia',
        amount: 10,
        transactionDate: '2026-09-10',
        type: 'EXPENSE',
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA,
        description: 'Data com horário',
        amount: 10,
        transactionDate: '2026-09-10T12:00:00Z',
        type: 'EXPENSE',
      })
      .expect(400);

    const expense = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountA,
        categoryId: foodCategoryId,
        description: 'Despesa E2E',
        amount: 100,
        transactionDate: '2026-09-10',
        type: 'EXPENSE',
      })
      .expect(201);
    expect(expense.body.amount).toBe(100);

    const transfer = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sourceAccountId: accountA,
        destinationAccountId: accountB,
        description: 'Transferência E2E',
        amount: 200,
        transactionDate: '2026-09-11',
      })
      .expect(201);
    expect(transfer.body.transactions).toHaveLength(2);
    expect(
      transfer.body.transactions.every(
        (transaction: { transferId: string }) =>
          transaction.transferId === transfer.body.id,
      ),
    ).toBe(true);

    const source = await request(app.getHttpServer())
      .get(`/accounts/${accountA}`)
      .set('Authorization', `Bearer ${tokenA}`);
    const destination = await request(app.getHttpServer())
      .get(`/accounts/${accountB}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(source.body.currentBalance).toBe(700);
    expect(destination.body.currentBalance).toBe(300);

    const concurrentTransaction = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        accountId: accountB,
        categoryId: foodCategoryId,
        description: 'Atualização concorrente',
        amount: 50,
        transactionDate: '2026-09-12',
        type: 'EXPENSE',
      })
      .expect(201);
    const concurrentUpdates = await Promise.all([
      request(app.getHttpServer())
        .patch(`/transactions/${concurrentTransaction.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: 60 }),
      request(app.getHttpServer())
        .patch(`/transactions/${concurrentTransaction.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: 70 }),
    ]);
    expect(concurrentUpdates.every((response) => response.status === 200)).toBe(
      true,
    );
    const finalConcurrentTransaction = await request(app.getHttpServer())
      .get(`/transactions/${concurrentTransaction.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const destinationAfterUpdates = await request(app.getHttpServer())
      .get(`/accounts/${accountB}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect([60, 70]).toContain(finalConcurrentTransaction.body.amount);
    expect(destinationAfterUpdates.body.currentBalance).toBe(
      300 - finalConcurrentTransaction.body.amount,
    );

    const page = await request(app.getHttpServer())
      .get('/transactions?page=1&limit=1&type=EXPENSE&search=despesa')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(page.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it('cria parcelamento, vincula faturas e impede pagamento duplicado', async () => {
    const card = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Cartão E2E',
        brand: 'Visa',
        lastFourDigits: '1234',
        creditLimit: 10000,
        closingDay: 10,
        dueDay: 17,
      })
      .expect(201);
    cardId = card.body.id;

    const cardExpense = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        creditCardId: cardId,
        categoryId: foodCategoryId,
        description: 'Compra na fatura E2E',
        amount: 120,
        transactionDate: '2026-09-05',
        type: 'EXPENSE',
      })
      .expect(201);

    const installment = await request(app.getHttpServer())
      .post('/installments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        creditCardId: cardId,
        categoryId: foodCategoryId,
        description: 'Notebook E2E',
        totalAmount: 1000.01,
        totalInstallments: 3,
        purchaseDate: '2026-09-12',
      })
      .expect(201);
    expect(installment.body.transactions).toHaveLength(3);
    expect(
      installment.body.transactions.reduce(
        (sum: number, transaction: { amount: number }) =>
          sum + transaction.amount,
        0,
      ),
    ).toBeCloseTo(1000.01, 2);
    expect(
      installment.body.transactions.every(
        (transaction: { installmentGroupId: string; invoiceId: string }) =>
          transaction.installmentGroupId === installment.body.id &&
          Boolean(transaction.invoiceId),
      ),
    ).toBe(true);

    const invoices = await request(app.getHttpServer())
      .get(`/credit-cards/${cardId}/invoices`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const invoice = invoices.body.find(
      (item: { referenceMonth: number; referenceYear: number }) =>
        item.referenceMonth === 9 && item.referenceYear === 2026,
    );
    expect(invoice.totalAmount).toBe(120);

    await request(app.getHttpServer())
      .post(`/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ accountId: accountA, paidAt: '2026-09-17' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ accountId: accountA })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/transactions/${cardExpense.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 100 })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/transactions/${cardExpense.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(409);
    await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const account = await request(app.getHttpServer())
      .get(`/accounts/${accountA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(account.body.currentBalance).toBe(580);

    const raceCard = await request(app.getHttpServer())
      .post('/credit-cards')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Cartão concorrência',
        brand: 'Visa',
        lastFourDigits: '9876',
        creditLimit: 1000,
        closingDay: 10,
        dueDay: 17,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        creditCardId: raceCard.body.id,
        categoryId: foodCategoryId,
        description: 'Base concorrente',
        amount: 100,
        transactionDate: '2026-09-05',
        type: 'EXPENSE',
      })
      .expect(201);
    const raceInvoices = await request(app.getHttpServer())
      .get(`/credit-cards/${raceCard.body.id}/invoices`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const raceInvoice = raceInvoices.body[0];
    const [paymentResult, purchaseResult] = await Promise.all([
      request(app.getHttpServer())
        .post(`/invoices/${raceInvoice.id}/pay`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ accountId: accountA, paidAt: '2026-09-18' }),
      request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          creditCardId: raceCard.body.id,
          categoryId: foodCategoryId,
          description: 'Compra concorrente',
          amount: 50,
          transactionDate: '2026-09-06',
          type: 'EXPENSE',
        }),
    ]);
    expect(paymentResult.status).toBe(200);
    expect([201, 409]).toContain(purchaseResult.status);

    const lockedInvoice = await request(app.getHttpServer())
      .get(`/invoices/${raceInvoice.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const balanceAfterRace = await request(app.getHttpServer())
      .get(`/accounts/${accountA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(lockedInvoice.body.status).toBe('PAID');
    expect(lockedInvoice.body.paidAmount).toBe(lockedInvoice.body.totalAmount);
    balanceBeforeImport = balanceAfterRace.body.currentBalance;
    expect(balanceAfterRace.body.currentBalance).toBe(
      580 - lockedInvoice.body.paidAmount,
    );
  });

  it('mantém preview separado, confirma CSV e bloqueia arquivo duplicado', async () => {
    const invalidCsv = `date;description;amount\n2026-09-20;;10,00\n2026-09-20;Valor zero;0\n2026-09-20;Escala inválida;1,234\n2026-09-20;Valor excessivo;9000000000000,01`;
    const invalidPreview = await request(app.getHttpServer())
      .post('/imports/csv/preview')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('accountId', accountA)
      .attach('file', Buffer.from(invalidCsv), {
        filename: 'invalidos.csv',
        contentType: 'text/csv',
      })
      .expect(201);
    expect(invalidPreview.body.items).toHaveLength(4);
    expect(
      invalidPreview.body.items.every(
        (item: { status: string; deduplicationHash: string | null }) =>
          item.status === 'INVALID' && item.deduplicationHash === null,
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .delete(`/imports/${invalidPreview.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const csv = `date;description;amount;externalId\n2026-09-20;Receita importada;50,00;e2e-income-${runId}\n2026-09-21;Despesa importada;-10,00;e2e-expense-${runId}`;
    const preview = await request(app.getHttpServer())
      .post('/imports/csv/preview')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('accountId', accountA)
      .attach('file', Buffer.from(csv), {
        filename: 'e2e.csv',
        contentType: 'text/csv',
      })
      .expect(201);
    expect(preview.body.items).toHaveLength(2);
    expect(
      preview.body.items.every(
        (item: { status: string }) => item.status === 'READY',
      ),
    ).toBe(true);

    const before = await request(app.getHttpServer())
      .get('/transactions?search=importada')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(before.body.meta.total).toBe(0);

    const confirmed = await request(app.getHttpServer())
      .post(`/imports/${preview.body.id}/confirm`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({})
      .expect(200);
    expect(confirmed.body.importedCount).toBe(2);

    await request(app.getHttpServer())
      .post('/imports/csv/preview')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('accountId', accountA)
      .attach('file', Buffer.from(csv), {
        filename: 'mesmo-conteudo.csv',
        contentType: 'text/csv',
      })
      .expect(409);

    const account = await request(app.getHttpServer())
      .get(`/accounts/${accountA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(account.body.currentBalance).toBe(balanceBeforeImport + 40);

    const raceCsv = `date;description;amount;externalId\n2026-09-22;Corrida lote;1,00;e2e-race-${runId}`;
    const racePreview = await request(app.getHttpServer())
      .post('/imports/csv/preview')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('accountId', accountA)
      .attach('file', Buffer.from(raceCsv), {
        filename: 'corrida.csv',
        contentType: 'text/csv',
      })
      .expect(201);
    const [confirmRace, cancelRace] = await Promise.all([
      request(app.getHttpServer())
        .post(`/imports/${racePreview.body.id}/confirm`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({}),
      request(app.getHttpServer())
        .delete(`/imports/${racePreview.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`),
    ]);
    expect(
      [confirmRace.status, cancelRace.status].sort((left, right) => left - right),
    ).toEqual([200, 409]);
    const batchAfterRace = await request(app.getHttpServer())
      .get(`/imports/${racePreview.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(['CONFIRMED', 'CANCELLED']).toContain(batchAfterRace.body.status);
    const transactionAfterRace = await request(app.getHttpServer())
      .get('/transactions?search=Corrida%20lote')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(transactionAfterRace.body.meta.total).toBe(
      batchAfterRace.body.status === 'CONFIRMED' ? 1 : 0,
    );
  });

  afterAll(async () => {
    if (userIds.length > 0) {
      await prisma.$transaction(async (database) => {
        const userIdFilter = { in: userIds };
        await database.importBatch.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.invoicePayment.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.transaction.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.transfer.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.installmentGroup.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.invoice.deleteMany({
          where: { creditCard: { userId: userIdFilter } },
        });
        await database.categorizationRule.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.creditCard.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.account.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.category.deleteMany({
          where: { userId: userIdFilter },
        });
        await database.user.deleteMany({
          where: { id: userIdFilter },
        });
      });
    }
    await app.close();
  });
});
