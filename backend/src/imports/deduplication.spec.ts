import { Prisma, TransactionType } from '../generated/prisma/client.js';
import { sha256, transactionDeduplicationHash } from './deduplication.js';

describe('deduplicação de importação', () => {
  const base = {
    userId: '0da2ce58-1359-4ddb-a09a-8857f7c03ef8',
    target: 'account:df0367ac-f39c-4785-b7b7-22ef598b23ab',
    description: 'IFOOD RESTAURANTE',
    amount: new Prisma.Decimal('25.00'),
    transactionDate: new Date('2026-09-24T00:00:00.000Z'),
    type: TransactionType.EXPENSE,
  };

  it('distingue ocorrências legítimas com o mesmo conteúdo', () => {
    expect(transactionDeduplicationHash(base, 0)).not.toBe(
      transactionDeduplicationHash(base, 1),
    );
  });

  it('prioriza o ID externo dentro da mesma conta', () => {
    const first = transactionDeduplicationHash(
      { ...base, externalId: 'bank-123' },
      0,
    );
    const changedDescription = transactionDeduplicationHash(
      { ...base, description: 'Descrição alterada', externalId: 'bank-123' },
      99,
    );
    expect(first).toBe(changedDescription);
  });

  it('gera SHA-256 determinístico para o arquivo', () => {
    expect(sha256(Buffer.from('csv'))).toBe(sha256('csv'));
    expect(sha256('csv')).toHaveLength(64);
  });
});
