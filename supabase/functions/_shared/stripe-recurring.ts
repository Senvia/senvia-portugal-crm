// Conversões puras entre objectos do Stripe e o domínio recorrente.
//
// Isolado de propósito: são estas regras que decidem quanto dinheiro fica
// registado e a que ciclo pertence. Sem I/O, para poderem ser testadas sem
// tocar no Stripe nem na base de dados.

export interface RecurringMetadata {
  organizationId: string;
  saleId: string;
  recurrenceId: string;
}

export type MetadataResult =
  | { ok: true; value: RecurringMetadata }
  | { ok: false; reason: "missing" | "malformed" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lê a identidade que gravámos no Stripe.
 *
 * Recusa em vez de adivinhar: um evento sem metadata nossa não pertence a
 * nenhuma venda que possamos identificar com certeza, e inventar uma associação
 * (pelo e-mail, pelo valor, pela venda mais recente) é como o dinheiro acaba
 * creditado ao cliente errado.
 */
export function parseRecurringMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): MetadataResult {
  if (!metadata) return { ok: false, reason: "missing" };

  const organizationId = metadata.senvia_organization_id;
  const saleId = metadata.senvia_sale_id;
  const recurrenceId = metadata.senvia_recurrence_id;

  if (!organizationId && !saleId && !recurrenceId) return { ok: false, reason: "missing" };
  if (!organizationId || !saleId || !recurrenceId) return { ok: false, reason: "malformed" };
  if (!UUID.test(organizationId) || !UUID.test(saleId) || !UUID.test(recurrenceId)) {
    return { ok: false, reason: "malformed" };
  }

  return { ok: true, value: { organizationId, saleId, recurrenceId } };
}

/** Cêntimos para euros. O Stripe conta em inteiros: 4990 → 49.90. */
export function centsToAmount(cents: number | null | undefined): number {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

function toDate(seconds: number | null | undefined): Date | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface CyclePeriod {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}

export interface InvoiceLikePeriod {
  period_start?: number | null;
  period_end?: number | null;
  created?: number | null;
  lines?: { data?: Array<{ period?: { start?: number | null; end?: number | null } }> };
}

/**
 * Competência do ciclo.
 *
 * Prefere o período da linha da fatura ao da fatura: numa subscrição, a linha é
 * que traz o mês que está a ser cobrado. O período da própria fatura pode ser
 * apenas o instante da emissão, e usá-lo colocava a receita no mês errado.
 *
 * A data de vencimento é limitada ao período porque a base de dados o exige
 * (due_date entre period_start e period_end); uma fatura emitida antes do
 * período começar violaria a constraint e o evento ficava por processar.
 */
export function invoicePeriod(invoice: InvoiceLikePeriod): CyclePeriod {
  const line = invoice.lines?.data?.[0]?.period;
  const start = toDate(line?.start ?? invoice.period_start) ?? toDate(invoice.created) ?? new Date();
  const fallbackEnd = new Date(start);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 1);
  fallbackEnd.setDate(fallbackEnd.getDate() - 1);
  const end = toDate(line?.end ?? invoice.period_end) ?? fallbackEnd;

  const safeEnd = end < start ? start : end;
  const created = toDate(invoice.created) ?? start;
  const due = created < start ? start : created > safeEnd ? safeEnd : created;

  return { periodStart: isoDate(start), periodEnd: isoDate(safeEnd), dueDate: isoDate(due) };
}

export interface SettlementAmounts {
  gross: number;
  fee: number;
  net: number;
}

/**
 * Bruto, taxa e líquido de uma fatura paga.
 *
 * O que liquida a dívida é o BRUTO — foi o que o cliente pagou. A taxa do Stripe
 * é um custo nosso, não um desconto na dívida dele. Registar o líquido como
 * pagamento (o que o webhook antigo fazia) deixa toda venda paga com uns
 * cêntimos por liquidar para sempre, e o financeiro nunca fecha.
 */
export function settlementAmounts(
  invoice: { amount_paid?: number | null; amount_due?: number | null },
  balanceTransaction?: { fee?: number | null; net?: number | null } | null,
): SettlementAmounts {
  const gross = centsToAmount(invoice.amount_paid ?? invoice.amount_due ?? 0);
  const fee = centsToAmount(balanceTransaction?.fee ?? 0);
  const net = balanceTransaction?.net != null ? centsToAmount(balanceTransaction.net) : gross - fee;
  return { gross, fee, net: net > gross ? gross : net };
}

/** Eventos que sabemos tratar. Os restantes são registados como ignorados. */
export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "invoice.created",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export type HandledEvent = (typeof HANDLED_EVENTS)[number];

export function isHandledEvent(type: string): type is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(type);
}

/**
 * Estado de cobrança a partir do estado da subscrição no Stripe.
 *
 * Devolve apenas cobrança. O estado do SERVIÇO não se deduz daqui: um cliente em
 * atraso continua a ter o serviço — quem o suspende é uma decisão de negócio,
 * tomada no CRM, não um efeito automático de um pagamento falhado.
 */
export function billingStatusFromSubscription(status: string): string | null {
  switch (status) {
    case "active":
    case "trialing":
      return "current";
    case "past_due":
    case "incomplete":
      return "past_due";
    case "unpaid":
      return "uncollectible";
    default:
      return null;
  }
}
