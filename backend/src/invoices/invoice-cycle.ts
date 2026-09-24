import { dateAtUtcDay } from '../common/date/date-only.js';

export interface InvoiceCycle {
  referenceMonth: number;
  referenceYear: number;
  closingDate: Date;
  dueDate: Date;
}

export function invoiceCycleFor(
  transactionDate: Date,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  let referenceYear = transactionDate.getUTCFullYear();
  let referenceMonthIndex = transactionDate.getUTCMonth();

  if (transactionDate.getUTCDate() > closingDay) {
    referenceMonthIndex += 1;
    if (referenceMonthIndex > 11) {
      referenceMonthIndex = 0;
      referenceYear += 1;
    }
  }

  const closingDate = dateAtUtcDay(
    referenceYear,
    referenceMonthIndex,
    closingDay,
  );
  let dueMonthIndex = referenceMonthIndex;
  let dueYear = referenceYear;

  if (dueDay <= closingDay) {
    dueMonthIndex += 1;
    if (dueMonthIndex > 11) {
      dueMonthIndex = 0;
      dueYear += 1;
    }
  }

  return {
    referenceMonth: referenceMonthIndex + 1,
    referenceYear,
    closingDate,
    dueDate: dateAtUtcDay(dueYear, dueMonthIndex, dueDay),
  };
}
