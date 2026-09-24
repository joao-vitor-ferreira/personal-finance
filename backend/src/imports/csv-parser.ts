import { parse } from 'csv-parse/sync';
import { MAX_TRANSACTION_AMOUNT } from '../common/money/money.js';
import { Prisma, TransactionType } from '../generated/prisma/client.js';

export interface ParsedCsvRow {
  rowNumber: number;
  description: string;
  amount: Prisma.Decimal | null;
  transactionDate: Date | null;
  type: TransactionType | null;
  externalId: string | null;
  validationErrors: string[];
}

const HEADER_ALIASES: Record<string, string> = {
  data: 'date',
  date: 'date',
  datatransacao: 'date',
  transactiondate: 'date',
  descricao: 'description',
  description: 'description',
  historico: 'description',
  memo: 'description',
  valor: 'amount',
  amount: 'amount',
  tipo: 'type',
  type: 'type',
  id: 'externalId',
  externalid: 'externalId',
  transactionid: 'externalId',
};

export function parseCsvRows(
  file: Buffer,
  requestedDelimiter?: ',' | ';',
): ParsedCsvRow[] {
  const content = file.toString('utf8');
  const delimiter = requestedDelimiter ?? detectDelimiter(content);
  const rows = parse(content, {
    bom: true,
    columns: (headers: string[]) => headers.map(canonicalHeader),
    delimiter,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return rows.map((row, index) => normalizeRow(row, index + 2));
}

function canonicalHeader(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
  return HEADER_ALIASES[normalized] ?? normalized;
}

function detectDelimiter(content: string): ',' | ';' {
  const firstLine = content.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

function normalizeRow(
  row: Record<string, string>,
  rowNumber: number,
): ParsedCsvRow {
  const validationErrors: string[] = [];
  const description = String(row.description ?? '').trim();
  if (!description) validationErrors.push('Descrição ausente.');
  if (description.length > 255)
    validationErrors.push('Descrição excede 255 caracteres.');

  const signedAmount = parseMoney(row.amount);
  let amount: Prisma.Decimal | null = null;
  if (!signedAmount || signedAmount.isZero()) {
    validationErrors.push('Valor monetário inválido ou igual a zero.');
  } else if (signedAmount.decimalPlaces() > 2) {
    validationErrors.push('Valor deve possuir no máximo duas casas decimais.');
  } else if (signedAmount.absoluteValue().greaterThan(MAX_TRANSACTION_AMOUNT)) {
    validationErrors.push('Valor excede o limite monetário permitido.');
  } else {
    amount = signedAmount.absoluteValue();
  }

  const transactionDate = parseCsvDate(row.date);
  if (!transactionDate)
    validationErrors.push('Data inválida. Use YYYY-MM-DD ou DD/MM/YYYY.');

  const type = parseTransactionType(row.type, signedAmount);
  if (!type)
    validationErrors.push(
      'Tipo inválido. Use INCOME/EXPENSE ou sinal no valor.',
    );

  return {
    rowNumber,
    description: description.slice(0, 255) || `Linha ${rowNumber}`,
    amount,
    transactionDate,
    type,
    externalId:
      String(row.externalId ?? '')
        .trim()
        .slice(0, 255) || null,
    validationErrors,
  };
}

function parseMoney(value: string | undefined): Prisma.Decimal | null {
  if (!value) return null;
  let normalized = String(value)
    .trim()
    .replace(/R\$|\s/g, '');
  const negativeByParentheses = /^\(.*\)$/.test(normalized);
  normalized = normalized.replace(/[()]/g, '');

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized =
      normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;

  try {
    const amount = new Prisma.Decimal(normalized);
    return negativeByParentheses ? amount.negated() : amount;
  } catch {
    return null;
  }
}

function parseCsvDate(value: string | undefined): Date | null {
  if (!value) return null;
  const normalized = String(value).trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  const parts = isoMatch
    ? [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])]
    : brMatch
      ? [Number(brMatch[3]), Number(brMatch[2]), Number(brMatch[1])]
      : null;

  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function parseTransactionType(
  value: string | undefined,
  signedAmount: Prisma.Decimal | null,
): TransactionType | null {
  const normalized = String(value ?? '')
    .trim()
    .toLocaleUpperCase('pt-BR');
  if (['INCOME', 'RECEITA', 'CREDIT'].includes(normalized)) {
    return TransactionType.INCOME;
  }
  if (['EXPENSE', 'DESPESA', 'DEBIT'].includes(normalized)) {
    return TransactionType.EXPENSE;
  }
  if (normalized) return null;
  if (!signedAmount) return null;
  return signedAmount.isNegative()
    ? TransactionType.EXPENSE
    : TransactionType.INCOME;
}
