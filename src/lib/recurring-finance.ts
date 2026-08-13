// Projecções financeiras das recorrências. Funções puras, sem I/O.
//
// A distinção que isto existe para resolver: COMPETÊNCIA e RECEBIMENTO não são a
// mesma coisa. Uma fatura de junho paga a 9 de julho é receita de junho e
// dinheiro entrado em julho. Misturar os dois faz o mês fechar sempre errado —
// e é exactamente o que acontecia quando tudo era datado pelo pagamento.

export type DateBasis = 'accrual' | 'cash';

export const DATE_BASIS_LABEL: Record<DateBasis, string> = {
  accrual: 'Competência',
  cash: 'Recebimento',
};

export interface CycleLike {
  period_start: string;
  amount: number | string;
  status: 'pending' | 'paid' | 'failed' | 'void';
  paid_at: string | null;
}

export interface PaymentLike {
  amount: number | string;
  stripe_gross_amount?: number | null;
  stripe_fee_amount?: number | null;
  stripe_net_amount?: number | null;
}

function num(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * A que mês pertence um ciclo, conforme a base escolhida.
 *
 * Em competência é o período coberto. Em recebimento é a data do pagamento — e
 * um ciclo por pagar não pertence a mês nenhum, porque o dinheiro não entrou.
 */
export function cycleMonth(cycle: CycleLike, basis: DateBasis): string | null {
  if (basis === 'accrual') return monthKey(cycle.period_start);
  if (cycle.status !== 'paid' || !cycle.paid_at) return null;
  return monthKey(cycle.paid_at);
}

export interface RecurringTotals {
  /** Valor com competência no período, independentemente de estar pago. */
  billed: number;
  /** Já liquidado. */
  settled: number;
  /** Vencido e ainda por liquidar. */
  outstanding: number;
  /** Ainda por vencer. */
  upcoming: number;
}

/**
 * Totais de um conjunto de ciclos.
 *
 * `outstanding` conta apenas o que já venceu: um ciclo de dezembro não é dívida
 * em agosto. Somar tudo o que não está pago transformava a receita futura
 * inteira em dívida, e o número deixava de significar nada.
 */
export function summarizeCycles(cycles: CycleLike[], today: string): RecurringTotals {
  return cycles.reduce<RecurringTotals>(
    (acc, cycle) => {
      const amount = num(cycle.amount);
      if (cycle.status === 'void') return acc;

      acc.billed += amount;
      if (cycle.status === 'paid') {
        acc.settled += amount;
      } else if (cycle.period_start <= today) {
        acc.outstanding += amount;
      } else {
        acc.upcoming += amount;
      }
      return acc;
    },
    { billed: 0, settled: 0, outstanding: 0, upcoming: 0 },
  );
}

/** Totais por mês, na base escolhida. Meses sem movimento não aparecem. */
export function monthlyTotals(
  cycles: CycleLike[],
  basis: DateBasis,
): Array<{ month: string; billed: number; settled: number }> {
  const byMonth = new Map<string, { billed: number; settled: number }>();

  for (const cycle of cycles) {
    if (cycle.status === 'void') continue;
    const month = cycleMonth(cycle, basis);
    if (!month) continue;

    const entry = byMonth.get(month) ?? { billed: 0, settled: 0 };
    const amount = num(cycle.amount);
    entry.billed += amount;
    if (cycle.status === 'paid') entry.settled += amount;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.entries())
    .map(([month, totals]) => ({ month, ...totals }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface NetRevenue {
  gross: number;
  fees: number;
  net: number;
}

/**
 * Bruto, taxas e líquido de um conjunto de pagamentos.
 *
 * O bruto é o que o cliente pagou e o que liquida a dívida; o líquido é o que
 * entra na conta. São dois números diferentes e ambos são precisos — apresentar
 * só um deles é o que fazia a receita não bater com o extrato bancário.
 *
 * Pagamentos antigos não têm a decomposição: nesses o bruto é o valor registado
 * e a taxa conta zero, em vez de se inventar uma estimativa.
 */
export function netRevenue(payments: PaymentLike[]): NetRevenue {
  return payments.reduce<NetRevenue>(
    (acc, payment) => {
      const gross = payment.stripe_gross_amount != null ? num(payment.stripe_gross_amount) : num(payment.amount);
      const fee = num(payment.stripe_fee_amount);
      const net = payment.stripe_net_amount != null ? num(payment.stripe_net_amount) : gross - fee;

      acc.gross += gross;
      acc.fees += fee;
      acc.net += net;
      return acc;
    },
    { gross: 0, fees: 0, net: 0 },
  );
}

/** Receita recorrente mensal das recorrências activas (MRR). */
export function monthlyRecurringRevenue(
  recurrences: Array<{ amount: number | string; service_status: string }>,
): number {
  return recurrences
    .filter((r) => r.service_status === 'active')
    .reduce((sum, r) => sum + num(r.amount), 0);
}
