import { createHash } from 'node:crypto';
import { formatDateOnly } from '../common/date/date-only.js';
import { Prisma, TransactionType } from '../generated/prisma/client.js';

export interface DeduplicationInput {
  userId: string;
  target: string;
  description: string;
  amount: Prisma.Decimal;
  transactionDate: Date;
  type: TransactionType;
  externalId?: string | null;
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function deduplicationBase(input: DeduplicationInput): string {
  const externalId = input.externalId?.trim();
  if (externalId) {
    return [
      'v1-external',
      input.userId,
      input.target,
      normalizeText(externalId),
    ].join('|');
  }

  return [
    'v1-content',
    input.userId,
    input.target,
    formatDateOnly(input.transactionDate),
    normalizeText(input.description),
    input.amount.toFixed(2),
    input.type,
  ].join('|');
}

export function transactionDeduplicationHash(
  input: DeduplicationInput,
  occurrenceIndex: number,
): string {
  const base = deduplicationBase(input);
  const suffix = input.externalId?.trim()
    ? ''
    : `|occurrence:${occurrenceIndex}`;
  return sha256(base + suffix);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
}
