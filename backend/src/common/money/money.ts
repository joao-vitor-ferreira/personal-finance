import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export const MAX_TRANSACTION_AMOUNT = new Prisma.Decimal('9000000000000.00');
export const MAX_API_MONEY = new Prisma.Decimal('90000000000000.00');

export function decimalToApiNumber(value: Prisma.Decimal): number {
  const cents = value.times(100);
  if (
    value.absoluteValue().greaterThan(MAX_API_MONEY) ||
    !cents.isInteger() ||
    !Number.isSafeInteger(cents.toNumber())
  ) {
    throw new UnprocessableEntityException(
      'O valor monetário excede a faixa segura da representação JSON.',
    );
  }

  return value.toNumber();
}
