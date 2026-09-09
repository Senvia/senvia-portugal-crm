/**
 * Filters for the telecom commission cards in Financeiro.
 *
 * Operators are opt-OUT: everything counts until an operator is switched off,
 * so "all except Digi" is one click. The excluded set is what gets persisted,
 * which also means an operator created tomorrow shows up ticked. A product
 * with no operator on it (the generic "1P ou 2P" sold under any brand) is its
 * own switch, NO_OPERATOR.
 */
import type { ServicosDetails } from '@/types/proposals';

/** Sentinel for sale lines that carry no operator at all. */
export const NO_OPERATOR = '__none__';

export interface CommissionFilters {
  /** Operator ids switched OFF, plus NO_OPERATOR for generic lines. Empty = all. */
  excludedOperators: string[];
  /** The seller a sale is assigned to; null = everyone. */
  userId: string | null;
  /** Telecom states switched OFF (pendente, em_instalacao, ativo, …). Empty = all. */
  excludedStatuses: string[];
}

export const DEFAULT_COMMISSION_FILTERS: CommissionFilters = {
  excludedOperators: [],
  userId: null,
  excludedStatuses: [],
};

export function hasCommissionFilters(f: CommissionFilters | undefined): boolean {
  return !!f && (f.excludedOperators.length > 0 || f.userId !== null || (f.excludedStatuses ?? []).length > 0);
}

/** Minimal shape of a sale row the predicate needs. */
export interface CommissionFilterableSale {
  seller_id?: string | null;
  created_by?: string | null;
  servicos_details?: unknown;
  telecom_status?: string | null;
}

/** The operators frozen on a sale's lines — read off the lines, never the catalog. */
export function saleOperatorKeys(sale: CommissionFilterableSale): string[] {
  const details = (sale.servicos_details ?? {}) as ServicosDetails;
  const keys = Object.values(details).map((d) => d?.operator_id || NO_OPERATOR);
  return keys.length > 0 ? [...new Set(keys)] : [NO_OPERATOR];
}

/**
 * Whether a sale survives the filters. A sale carrying lines from several
 * operators stays in while ANY of them is still switched on — the commission
 * is booked per sale, not per line, so it cannot be split here.
 */
export function saleMatchesCommissionFilters(
  sale: CommissionFilterableSale,
  filters: CommissionFilters | undefined,
): boolean {
  if (!hasCommissionFilters(filters)) return true;
  const f = filters as CommissionFilters;
  if (f.userId && (sale.seller_id || sale.created_by) !== f.userId) return false;
  // A sale with no telecom state yet is not in any bucket, so no switch
  // can turn it off. (`?? []` because the filters are persisted and older
  // saved copies predate this field.)
  if (sale.telecom_status && (f.excludedStatuses ?? []).includes(sale.telecom_status)) return false;
  if (f.excludedOperators.length > 0) {
    const excluded = new Set(f.excludedOperators);
    if (!saleOperatorKeys(sale).some((k) => !excluded.has(k))) return false;
  }
  return true;
}
