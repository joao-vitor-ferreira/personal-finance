import { BadRequestException } from '@nestjs/common';
import { isDateOnly } from '../validators/date-only.validator.js';

export function parseDateOnly(value: string): Date {
  if (!isDateOnly(value)) {
    throw new BadRequestException(
      'A data deve ser válida e estar no formato YYYY-MM-DD.',
    );
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateAtUtcDay(
  year: number,
  zeroBasedMonth: number,
  day: number,
): Date {
  const lastDay = new Date(Date.UTC(year, zeroBasedMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, zeroBasedMonth, Math.min(day, lastDay)));
}

export function addUtcMonths(value: Date, months: number): Date {
  const firstDayOfTargetMonth = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  );

  return dateAtUtcDay(
    firstDayOfTargetMonth.getUTCFullYear(),
    firstDayOfTargetMonth.getUTCMonth(),
    value.getUTCDate(),
  );
}
