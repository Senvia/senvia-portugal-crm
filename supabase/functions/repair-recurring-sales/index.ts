// Reparação conservadora dos dados recorrentes já existentes.
//
// DRY-RUN POR OMISSÃO. Só escreve com {"apply": true}. Mexer em pagamentos
// reais sem alguém ver primeiro o que vai mudar é como se estragam contas.
//
// O que repara, e só isto:
//
//   1. Pagamentos Stripe registados pelo LÍQUIDO. O valor verdadeiro vem da
//      fatura no Stripe — nunca é estimado. Sem fatura acessível, não toca.
//   2. Ciclos em falta para pagamentos que já têm período de competência, e a
//      ligação pagamento ↔ ciclo.
//   3. Recorrências ainda marcadas 'manual' que na verdade têm subscrição
//      Stripe viva: promove-as, para as renovações passarem a liquidar sozinhas.
//
// O que NÃO faz, deliberadamente: não apaga pagamentos, não resolve associações
// ambíguas, não inventa valores. Uma venda que não consiga reparar com certeza
// fica listada como "por decidir" para alguém olhar.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { invoiceMetadata, invoicePaymentIds } from "../_shared/stripe-recurring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[REPAIR-RECURRING-SALES] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

interface PaymentRow {
  id: string;
  sale_id: string;
  organization_id: string;
  amount: number;
  payment_date: string;
  stripe_invoice_id: string;
  stripe_gross_amount: number | null;
  recurring_cycle_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
}

interface SubscriptionLine {
  priceId: string;
  quantity: number;
  unitAmount: number;
}

interface Action {
  saleId: string;
  paymentId: string;
  kind: string;
  detail: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

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

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const apply = body.apply === true;
  const onlySaleId: string | null = body.saleId ?? null;

  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY em falta" }), { status: 500 });
  }
  const stripe = new Stripe(sk, { apiVersion: "2025-08-27.basil" });

  const planned: Action[] = [];
  const undecided: Array<{ saleId: string; reason: string }> = [];

  // ── Pagamentos Stripe por reparar ─────────────────────────────────────────
  let query = supabase
    .from("sale_payments")
    .select("id, sale_id, organization_id, amount, payment_date, stripe_invoice_id, stripe_gross_amount, recurring_cycle_id, billing_period_start, billing_period_end")
    .not("stripe_invoice_id", "is", null)
    .order("payment_date", { ascending: true })
    .limit(500);
  if (onlySaleId) query = query.eq("sale_id", onlySaleId);

  const { data: payments, error: payErr } = await query;
  if (payErr) {
    return new Response(JSON.stringify({ error: payErr.message }), { status: 500 });
  }

  for (const payment of (payments ?? []) as PaymentRow[]) {
    // ── 1. Valor verdadeiro, lido do Stripe ─────────────────────────────────
    let gross: number | null = null;
    let fee = 0;
    let net: number | null = null;
    let subscriptionId: string | null = null;

    try {
      const invoice = await stripe.invoices.retrieve(payment.stripe_invoice_id, { expand: ["payments"] });
      const raw = invoice as unknown as Record<string, unknown>;
      gross = round2(((invoice.amount_paid ?? invoice.amount_due ?? 0) as number) / 100);

      const parent = raw.parent as { subscription_details?: { subscription?: unknown } } | undefined;
      const subRef = parent?.subscription_details?.subscription ?? (raw.subscription as unknown);
      subscriptionId = typeof subRef === "string" ? subRef : (subRef as { id?: string } | undefined)?.id ?? null;

      const { chargeId, paymentIntentId } = invoicePaymentIds(raw);
      let charge: Stripe.Charge | null = null;
      if (chargeId) {
        charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
      } else if (paymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge.balance_transaction"],
        });
        const latest = intent.latest_charge;
        charge = latest && typeof latest !== "string" ? latest : null;
      }
      let bt = charge?.balance_transaction ?? null;
      if (typeof bt === "string") bt = await stripe.balanceTransactions.retrieve(bt);
      if (bt && typeof bt !== "string") {
        fee = round2(bt.fee / 100);
        net = round2(bt.net / 100);
      }
    } catch (e) {
      // Sem a fatura não há valor de confiança. Não se estima nada.
      undecided.push({ saleId: payment.sale_id, reason: `fatura ${payment.stripe_invoice_id} inacessível` });
      continue;
    }

    if (gross === null) continue;
    if (net === null) net = round2(gross - fee);

    const amountWrong = Math.abs(Number(payment.amount) - gross) > 0.005;
    const missingBreakdown = payment.stripe_gross_amount === null;

    if (amountWrong || missingBreakdown) {
      planned.push({
        saleId: payment.sale_id,
        paymentId: payment.id,
        kind: amountWrong ? "valor_corrigido_para_bruto" : "decomposicao_preenchida",
        detail: `${Number(payment.amount).toFixed(2)}€ → bruto ${gross.toFixed(2)}€ (taxa ${fee.toFixed(2)}€, líquido ${net.toFixed(2)}€)`,
      });
      if (apply) {
        await supabase
          .from("sale_payments")
          .update({
            amount: gross,
            stripe_gross_amount: gross,
            stripe_fee_amount: fee,
            stripe_net_amount: net,
          })
          .eq("id", payment.id);
      }
    }

    // ── 2. Ciclo em falta para esta competência ─────────────────────────────
    if (!payment.recurring_cycle_id && payment.billing_period_start && payment.billing_period_end) {
      const { data: recurrences } = await supabase
        .from("sale_recurrences")
        .select("id, billing_provider, stripe_subscription_id")
        .eq("sale_id", payment.sale_id)
        .in("service_status", ["pending", "active", "paused"])
        .order("created_at", { ascending: false })
        .limit(1);
      const recurrence = recurrences?.[0];

      if (!recurrence) {
        undecided.push({ saleId: payment.sale_id, reason: "sem recorrência aberta para associar o ciclo" });
      } else {
        // Período degenerado (início = fim) não define competência nenhuma.
        if (payment.billing_period_start === payment.billing_period_end) {
          undecided.push({
            saleId: payment.sale_id,
            reason: `pagamento ${payment.id} tem período degenerado (${payment.billing_period_start})`,
          });
        } else {
          planned.push({
            saleId: payment.sale_id,
            paymentId: payment.id,
            kind: "ciclo_criado_e_ligado",
            detail: `${payment.billing_period_start} → ${payment.billing_period_end}, ${gross.toFixed(2)}€ liquidado`,
          });

          if (apply) {
            const { data: existingCycle } = await supabase
              .from("sale_recurring_cycles")
              .select("id")
              .eq("recurrence_id", recurrence.id)
              .eq("period_start", payment.billing_period_start)
              .maybeSingle();

            let cycleId = existingCycle?.id ?? null;
            if (!cycleId) {
              const due = payment.payment_date < payment.billing_period_start
                ? payment.billing_period_start
                : payment.payment_date > payment.billing_period_end
                  ? payment.billing_period_end
                  : payment.payment_date;
              const { data: created } = await supabase
                .from("sale_recurring_cycles")
                .insert({
                  recurrence_id: recurrence.id,
                  sale_id: payment.sale_id,
                  organization_id: payment.organization_id,
                  period_start: payment.billing_period_start,
                  period_end: payment.billing_period_end,
                  due_date: due,
                  amount: gross,
                  currency: "EUR",
                  status: "paid",
                  paid_at: new Date(payment.payment_date).toISOString(),
                  stripe_invoice_id: payment.stripe_invoice_id,
                })
                .select("id")
                .maybeSingle();
              cycleId = created?.id ?? null;
            }
            if (cycleId) {
              await supabase
                .from("sale_payments")
                .update({ recurring_cycle_id: cycleId })
                .eq("id", payment.id);
            }
          }
        }
      }

      // ── 3b. Itens da venda, a partir da subscrição real ───────────────────
      // Sem isto a venda mostra um valor e mais nada: ninguém sabe QUE serviços
      // o cliente está a pagar. Os itens vêm da subscrição no Stripe, traduzidos
      // pelo catálogo sincronizado — nunca adivinhados.
      if (subscriptionId) {
        const { count: itemCount } = await supabase
          .from("sale_items")
          .select("id", { count: "exact", head: true })
          .eq("sale_id", payment.sale_id);

        if ((itemCount ?? 0) === 0) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const lines: SubscriptionLine[] = sub.items.data
              .filter((item: Stripe.SubscriptionItem) => item.price?.id && item.price.unit_amount != null)
              .map((item: Stripe.SubscriptionItem) => ({
                priceId: item.price.id,
                quantity: item.quantity ?? 1,
                unitAmount: (item.price.unit_amount ?? 0) / 100,
              }));

            // O nome do produto vem junto: sale_items exige `name` e `total`, e
            // sem eles o insert falha em silêncio e a venda fica sem itens.
            const { data: mappings } = await supabase
              .from("stripe_product_mappings")
              .select("product_id, stripe_price_id, products(name)")
              .eq("organization_id", payment.organization_id)
              .in("stripe_price_id", lines.map((l: SubscriptionLine) => l.priceId));
            const productByPrice = new Map<string, { id: string; name: string }>(
              ((mappings ?? []) as Array<{ product_id: string; stripe_price_id: string; products?: { name?: string } | null }>)
                .map((m) => [m.stripe_price_id, { id: m.product_id, name: m.products?.name ?? "Serviço" }]),
            );

            const rows = lines
              .filter((l: SubscriptionLine) => productByPrice.has(l.priceId))
              .map((l: SubscriptionLine) => {
                const product = productByPrice.get(l.priceId) as { id: string; name: string };
                return {
                  sale_id: payment.sale_id,
                  product_id: product.id,
                  name: product.name,
                  quantity: l.quantity,
                  unit_price: l.unitAmount,
                  total: round2(l.unitAmount * l.quantity),
                };
              });

            const unmapped = lines.filter((l: SubscriptionLine) => !productByPrice.has(l.priceId));
            for (const l of unmapped) {
              undecided.push({
                saleId: payment.sale_id,
                reason: `preço ${l.priceId} da subscrição não está no catálogo sincronizado`,
              });
            }

            if (rows.length > 0) {
              planned.push({
                saleId: payment.sale_id,
                paymentId: payment.id,
                kind: "itens_da_venda_criados",
                detail: rows.map((r: { quantity: number; unit_price: number }) => `${r.quantity}× ${r.unit_price.toFixed(2)}€`).join(" + "),
              });
              if (apply) {
                const { error: itemsErr } = await supabase.from("sale_items").insert(rows);
                if (itemsErr) log("falha a criar itens", { message: itemsErr.message });
              }
            }
          } catch (e) {
            undecided.push({
              saleId: payment.sale_id,
              reason: `subscrição ${subscriptionId} inacessível para derivar itens`,
            });
          }
        }
      }

      // ── 3. Promover recorrência manual que tem subscrição viva ────────────
      if (recurrence && subscriptionId && !recurrence.stripe_subscription_id) {
        planned.push({
          saleId: payment.sale_id,
          paymentId: payment.id,
          kind: "recorrencia_promovida_a_stripe",
          detail: `subscrição ${subscriptionId} ligada; renovações passam a liquidar sozinhas`,
        });
        if (apply) {
          await supabase
            .from("sale_recurrences")
            .update({
              billing_provider: "stripe",
              stripe_subscription_id: subscriptionId,
              billing_status: "current",
              updated_at: new Date().toISOString(),
            })
            .eq("id", recurrence.id);
        }
      }
    }
  }

  log(apply ? "reparação aplicada" : "simulação", { accoes: planned.length, porDecidir: undecided.length });

  return new Response(
    JSON.stringify({ mode: apply ? "apply" : "dry-run", planned, undecided }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
