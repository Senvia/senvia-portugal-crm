// Relatório read-only das vendas recorrentes.
//
// NÃO ESCREVE NADA. É deliberado: antes de reparar dados de dinheiro é preciso
// saber exactamente o que está partido e quanto vale. Uma reparação feita às
// cegas sobre pagamentos reais é pior do que o problema que tenta resolver.
//
// A reparação vive noutra função, e só deve correr depois de alguém ler isto.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AUDIT-RECURRING-SALES] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function isAuthorized(req: Request, supabase: SupabaseClient): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("key");
  if (!provided) return false;

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && provided === cronSecret) return true;

  const { data, error } = await supabase.rpc("verify_stripe_cron_secret", { p_secret: provided });
  if (error) return false;
  return data === true;
}

interface Finding {
  kind: string;
  severity: "alta" | "media" | "baixa";
  description: string;
  count: number;
  amountAtRisk?: number;
  samples: string[];
}

interface PaymentRow {
  id: string;
  sale_id: string;
  amount: number;
  stripe_gross_amount: number | null;
  stripe_fee_amount: number | null;
  stripe_invoice_id: string | null;
  recurring_cycle_id: string | null;
}

interface RecurrenceRow {
  id: string;
  sale_id: string;
  service_status: string;
  billing_status: string;
  billing_provider: string;
  next_cycle_date: string | null;
  stripe_subscription_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  if (!(await isAuthorized(req, supabase))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const findings: Finding[] = [];

  // ── 1. Pagamentos Stripe registados pelo LÍQUIDO ──────────────────────────
  // O defeito de origem: o webhook antigo gravava amount = líquido. Cada venda
  // fica com o valor da taxa por liquidar, para sempre, e o financeiro nunca
  // fecha. Aqui contamos quanto dinheiro está nesse estado.
  const { data: netPayments } = await supabase
    .from("sale_payments")
    .select("id, sale_id, amount, stripe_gross_amount, stripe_fee_amount, stripe_invoice_id, recurring_cycle_id")
    .not("stripe_invoice_id", "is", null)
    .limit(2000);

  const rows = (netPayments ?? []) as PaymentRow[];
  const underRecorded = rows.filter(
    (p) => p.stripe_gross_amount != null && Number(p.amount) < Number(p.stripe_gross_amount) - 0.005,
  );
  const missingGross = rows.filter((p) => p.stripe_gross_amount == null);

  if (underRecorded.length > 0) {
    findings.push({
      kind: "pagamento_pelo_liquido",
      severity: "alta",
      description:
        "Pagamentos Stripe registados abaixo do valor bruto. A diferença é a taxa do Stripe, que ficou indevidamente a abater à dívida do cliente — estas vendas nunca chegam a 100% liquidadas.",
      count: underRecorded.length,
      amountAtRisk: Number(
        underRecorded
          .reduce((sum, p) => sum + (Number(p.stripe_gross_amount) - Number(p.amount)), 0)
          .toFixed(2),
      ),
      samples: underRecorded.slice(0, 5).map((p) => p.stripe_invoice_id ?? p.id),
    });
  }

  if (missingGross.length > 0) {
    findings.push({
      kind: "sem_decomposicao_bruto_taxa",
      severity: "media",
      description:
        "Pagamentos Stripe sem bruto/taxa/líquido decompostos. Foram registados antes desta separação existir; não se sabe quanto foi taxa.",
      count: missingGross.length,
      samples: missingGross.slice(0, 5).map((p) => p.stripe_invoice_id ?? p.id),
    });
  }

  // ── 2. Pagamentos Stripe sem ciclo ────────────────────────────────────────
  const orphanPayments = rows.filter((p) => p.recurring_cycle_id == null);
  if (orphanPayments.length > 0) {
    findings.push({
      kind: "pagamento_sem_ciclo",
      severity: "media",
      description:
        "Pagamentos de subscrição sem ciclo associado. Entram no total da venda mas não aparecem em nenhuma competência mensal, por isso o financeiro por mês não bate certo.",
      count: orphanPayments.length,
      samples: orphanPayments.slice(0, 5).map((p) => p.stripe_invoice_id ?? p.id),
    });
  }

  // ── 3. Recorrências activas paradas no tempo ──────────────────────────────
  const { data: recurrences } = await supabase
    .from("sale_recurrences")
    .select("id, sale_id, service_status, billing_status, billing_provider, next_cycle_date, stripe_subscription_id")
    .eq("service_status", "active")
    .limit(2000);

  const recurrenceRows = (recurrences ?? []) as RecurrenceRow[];

  const overdue = recurrenceRows.filter(
    (r) => r.billing_provider === "manual" && r.next_cycle_date != null && r.next_cycle_date < today,
  );
  if (overdue.length > 0) {
    findings.push({
      kind: "renovacao_manual_vencida",
      severity: "alta",
      description:
        "Recorrências manuais activas cuja data de renovação já passou e continuam sem ciclo gerado. Na prática, serviço a ser prestado sem ninguém o cobrar.",
      count: overdue.length,
      samples: overdue.slice(0, 5).map((r) => r.sale_id),
    });
  }

  const stripeWithoutSubscription = recurrenceRows.filter(
    (r) => r.billing_provider === "stripe" && !r.stripe_subscription_id,
  );
  if (stripeWithoutSubscription.length > 0) {
    findings.push({
      kind: "stripe_sem_subscricao",
      severity: "alta",
      description:
        "Recorrências marcadas como Stripe mas sem subscrição criada. O cliente nunca chegou a concluir o Checkout: o serviço está activo e não existe cobrança nenhuma do lado do Stripe.",
      count: stripeWithoutSubscription.length,
      samples: stripeWithoutSubscription.slice(0, 5).map((r) => r.sale_id),
    });
  }

  // ── 4. Ciclos vencidos por liquidar ───────────────────────────────────────
  const { data: unpaidCycles } = await supabase
    .from("sale_recurring_cycles")
    .select("id, sale_id, amount, due_date, status")
    .in("status", ["pending", "failed"])
    .lt("due_date", today)
    .limit(2000);

  const unpaid = (unpaidCycles ?? []) as Array<{ id: string; sale_id: string; amount: number }>;
  if (unpaid.length > 0) {
    findings.push({
      kind: "ciclo_vencido_por_liquidar",
      severity: "media",
      description:
        "Ciclos com vencimento passado ainda por liquidar. Pode ser dívida real por cobrar, ou pagamento recebido que nunca foi associado — a reconciliação distingue.",
      count: unpaid.length,
      amountAtRisk: Number(unpaid.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)),
      samples: unpaid.slice(0, 5).map((c) => c.sale_id),
    });
  }

  // ── 5. Eventos Stripe que ficaram por processar ───────────────────────────
  const { count: failedEvents } = await supabase
    .from("stripe_events")
    .select("id", { count: "exact", head: true })
    .in("status", ["processing", "failed"]);

  if ((failedEvents ?? 0) > 0) {
    findings.push({
      kind: "evento_por_processar",
      severity: "alta",
      description:
        "Eventos Stripe presos em 'processing' ou 'failed'. Cada um pode ser um pagamento recebido que o CRM não registou.",
      count: failedEvents ?? 0,
      samples: [],
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    findings: findings.sort((a, b) => (a.severity === "alta" ? -1 : b.severity === "alta" ? 1 : 0)),
    totals: {
      issues: findings.length,
      amountAtRisk: Number(
        findings.reduce((sum, f) => sum + (f.amountAtRisk ?? 0), 0).toFixed(2),
      ),
    },
  };

  log("auditoria concluída", { issues: findings.length });

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
