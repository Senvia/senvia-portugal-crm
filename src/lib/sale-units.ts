const HALF_UNIT = 0.5;

export interface SaleUnitsSource {
  operational_units?: number | null;
  servicos_details?: unknown;
}

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeOperationalUnits(value: number): number {
  if (!Number.isFinite(value)) return HALF_UNIT;
  return Math.max(HALF_UNIT, Math.round(value / HALF_UNIT) * HALF_UNIT);
}

export function commissionUnits(quantity: number): number {
  return Math.max(1, Math.ceil(positiveNumber(quantity) ?? 1));
}

export function operationalUnitsForSale(sale: SaleUnitsSource): number {
  const persisted = positiveNumber(sale.operational_units);
  if (persisted !== null) return persisted;

  if (!sale.servicos_details || typeof sale.servicos_details !== 'object' || Array.isArray(sale.servicos_details)) {
    return 1;
  }

  const total = Object.values(sale.servicos_details).reduce((sum, rawDetail) => {
    if (!rawDetail || typeof rawDetail !== 'object' || Array.isArray(rawDetail)) return sum;
    const detail = rawDetail as Record<string, unknown>;
    return sum + (positiveNumber(detail.quantidade) ?? 0);
  }, 0);

  return total > 0 ? total : 1;
}

export function sumOperationalSaleUnits(sales: readonly SaleUnitsSource[]): number {
  return sales.reduce((sum, sale) => sum + operationalUnitsForSale(sale), 0);
}

export function formatOperationalUnits(value: number): string {
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value);
}
