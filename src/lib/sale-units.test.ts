import { describe, expect, test } from 'bun:test';
import {
  commissionUnits,
  formatOperationalUnits,
  normalizeOperationalUnits,
  operationalUnitsForSale,
  sumOperationalSaleUnits,
} from './sale-units';

describe('sale units', () => {
  test('preserves half a unit for operational totals', () => {
    expect(normalizeOperationalUnits(0.5)).toBe(0.5);
    expect(operationalUnitsForSale({ operational_units: 0.5 })).toBe(0.5);
    expect(sumOperationalSaleUnits([
      { operational_units: 0.5 },
      { operational_units: 1 },
      { operational_units: 2 },
    ])).toBe(3.5);
    expect(formatOperationalUnits(0.5)).toBe('0,5');
  });

  test('counts half a unit as one unit for commission', () => {
    expect(commissionUnits(0.5)).toBe(1);
    expect(commissionUnits(1)).toBe(1);
    expect(commissionUnits(1.5)).toBe(2);
  });

  test('reads legacy telecom quantities without changing old unit sales', () => {
    expect(operationalUnitsForSale({
      servicos_details: {
        Internet: { quantidade: 0.5 },
        Telefone: { quantidade: 1 },
      },
    })).toBe(1.5);
    expect(operationalUnitsForSale({})).toBe(1);
  });

  test('normalizes form quantities to positive half-unit increments', () => {
    expect(normalizeOperationalUnits(0)).toBe(0.5);
    expect(normalizeOperationalUnits(0.74)).toBe(0.5);
    expect(normalizeOperationalUnits(0.76)).toBe(1);
  });
});
