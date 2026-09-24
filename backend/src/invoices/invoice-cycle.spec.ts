import { invoiceCycleFor } from './invoice-cycle.js';

describe('ciclo de fatura', () => {
  it('mantém compra anterior ao fechamento no mês atual', () => {
    const cycle = invoiceCycleFor(new Date('2026-09-05T00:00:00.000Z'), 10, 17);
    expect(cycle.referenceMonth).toBe(9);
    expect(cycle.referenceYear).toBe(2026);
    expect(cycle.closingDate.toISOString().slice(0, 10)).toBe('2026-09-10');
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe('2026-09-17');
  });

  it('move compra posterior ao fechamento para o ciclo seguinte', () => {
    const cycle = invoiceCycleFor(new Date('2026-12-20T00:00:00.000Z'), 10, 5);
    expect(cycle.referenceMonth).toBe(1);
    expect(cycle.referenceYear).toBe(2027);
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe('2027-02-05');
  });

  it('ajusta dia inexistente para o último dia do mês', () => {
    const cycle = invoiceCycleFor(new Date('2028-02-10T00:00:00.000Z'), 31, 31);
    expect(cycle.closingDate.toISOString().slice(0, 10)).toBe('2028-02-29');
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe('2028-03-31');
  });
});
