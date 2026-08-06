import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Daily safety net for the finance pipeline: lists PAID Stripe invoices from
// the last N days and records any that stripe-webhook missed (delivery failure,
// signature mismatch, downtime). Mirrors handleInvoicePaid in
// ../stripe-webhook/index.ts — keep the two in sync when the money logic
// changes. Idempotent: an invoice already present in sale_payments (matched by
// its Stripe invoice id in the notes) or stripe_commission_records is skipped.

const SENVIA_AGENCY_ORG_ID = "06fe9e1d-9670-45b0-8717-c5a6e90be380";

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U0wAc7Tuy8w6gA": "starter",
  "prod_U0wGoA4odOBHOZ": "pro",
  "prod_U0wG6doz0zgZFV": "elite",
};

const PLAN_LIST_NAMES: Record<string, string> = {
  starter: "Plano Starter",
  pro: "Plano Pro",
  elite: "Plano Elite",
};

const DEFAULT_LOOKBACK_DAYS = 10;
const BILLING_FEE_RATE = 0.007;
const round2 = (n: number) => Math.round(n * 100) / 100;

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RECONCILE-STRIPE-PAYMENTS] ${step}${d}`);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lightweight Stripe API calls without the heavy SDK
async function stripeGet(path: string, key: string, params?: Record<string, string>) {
  const url = new URL(`https://api.stripe.com/v1${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${body?.error?.message || res.status}`);
  return body;
}

// The subscription/charge/payment_intent fields moved around across Stripe API
// versions (Basil moved invoice.subscription under parent.subscription_details).
// Read both shapes.
function invoiceSubscriptionId(inv: any): string | null {
  const idOf = (v: any): string | null => (typeof v === "string" ? v : v?.id) || null;
  return idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription);
}

function invoiceChargeIds(inv: any): { chargeId: string | null; piId: string | null } {
  const idOf = (v: any): string | null => (typeof v === "string" ? v : v?.id) || null;
  let chargeId = idOf(inv.charge);
  let piId = idOf(inv.payment_intent);
  if (!chargeId && !piId && inv.payments?.data?.length) {
    piId = idOf(inv.payments.data[0]?.payment?.payment_intent);
  }
  return { chargeId, piId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    let lookbackDays = DEFAULT_LOOKBACK_DAYS;
    try {
      const body = await req.json();
      if (body?.lookback_days && Number(body.lookback_days) > 0) {
        lookbackDays = Math.min(Number(body.lookback_days), 90);
      }
    } catch { /* empty body is fine */ }

    const createdGte = Math.floor(Date.now() / 1000) - lookbackDays * 86400;
    logStep("Starting", { lookbackDays });

    // All paid invoices in the window
    const invoices: any[] = [];
    let startingAfter: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const params: Record<string, string> = { status: "paid", limit: "100", "created[gte]": String(createdGte) };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripeGet("/invoices", stripeKey, params);
      invoices.push(...(batch.data ?? []));
      hasMore = !!batch.has_more;
      if (batch.data?.length) startingAfter = batch.data[batch.data.length - 1].id;
    }
    logStep("Paid invoices in window", { count: invoices.length });

    // email -> orgId map built once per run (webhook resolves per event)
    const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw new Error(`listUsers: ${listErr.message}`);
    const userByEmail: Record<string, string> = {};
    for (const u of usersPage.users) {
      if (u.email) userByEmail[u.email.toLowerCase()] = u.id;
    }
    const orgByUser: Record<string, string> = {};
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, organization_id")
      .eq("is_active", true);
    for (const m of members ?? []) {
      if (!orgByUser[m.user_id]) orgByUser[m.user_id] = m.organization_id;
    }
    const findOrgByEmail = (email: string): string | null => {
      const uid = userByEmail[email.toLowerCase()];
      return uid ? orgByUser[uid] ?? null : null;
    };

    const summary = {
      scanned: invoices.length,
      recorded: [] as Array<Record<string, unknown>>,
      already_recorded: 0,
      no_org: 0,
      no_sale: 0,
      zero_amount: 0,
      no_email: 0,
    };

    for (const invoice of invoices) {
      const email = invoice.customer_email;
      if (!email) { summary.no_email++; continue; }
      const amount = (invoice.amount_paid || 0) / 100;
      if (amount <= 0) { summary.zero_amount++; continue; }

      // Dedupe: webhook writes the invoice id into the payment notes
      const { data: existingPayment } = await supabase
        .from("sale_payments")
        .select("id")
        .eq("organization_id", SENVIA_AGENCY_ORG_ID)
        .ilike("notes", `%${invoice.id}%`)
        .limit(1);
      if (existingPayment && existingPayment.length > 0) { summary.already_recorded++; continue; }

      const clientOrgId = findOrgByEmail(email);
      if (!clientOrgId) { logStep("no org for email", { email }); summary.no_org++; continue; }

      // Plan + real recurring total from the live subscription
      let plan: string | null = null;
      let recurringTotal = 0;
      let subscriptionRenewalDate: string | null = null;
      let subPeriodEndUnix: number | null = null;
      const subId = invoiceSubscriptionId(invoice);
      if (subId) {
        try {
          const sub = await stripeGet(`/subscriptions/${subId}`, stripeKey);
          const productId = sub.items?.data?.[0]?.price?.product as string | undefined;
          plan = productId ? PRODUCT_TO_PLAN[productId] || null : null;
          recurringTotal = (sub.items?.data ?? []).reduce((sum: number, item: any) => {
            if (item.price?.recurring && item.price.unit_amount != null) {
              return sum + (item.price.unit_amount / 100) * (item.quantity || 1);
            }
            return sum;
          }, 0);
          subPeriodEndUnix = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
          if (subPeriodEndUnix) {
            subscriptionRenewalDate = new Date(subPeriodEndUnix * 1000).toISOString().split("T")[0];
          }
        } catch (e) {
          logStep("failed to fetch sub details", { error: (e as Error).message });
        }
      }

      const paidAtUnix = invoice.status_transitions?.paid_at ?? invoice.created;
      const paidAtIso = new Date(paidAtUnix * 1000).toISOString();
      const paymentDate = paidAtIso.split("T")[0];
      const periodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString().split("T")[0]
        : null;

      // Org bookkeeping (all idempotent): paying customer stamp, renewal date,
      // and clear a failure clock that predates this payment (never a newer one).
      await supabase
        .from("organizations")
        .update({ first_paid_at: paidAtIso })
        .eq("id", clientOrgId)
        .is("first_paid_at", null);
      if (subPeriodEndUnix) {
        await supabase
          .from("organizations")
          .update({ current_period_end: new Date(subPeriodEndUnix * 1000).toISOString() })
          .eq("id", clientOrgId);
      }
      await supabase
        .from("organizations")
        .update({ payment_failed_at: null })
        .eq("id", clientOrgId)
        .lt("payment_failed_at", paidAtIso);

      // Linked sale in the agency org
      const { data: sales, error: salesErr } = await supabase
        .from("sales")
        .select("id, created_by, total_value, has_recurring, status")
        .eq("organization_id", SENVIA_AGENCY_ORG_ID)
        .eq("client_org_id", clientOrgId)
        .in("status", ["in_progress", "fulfilled", "delivered"])
        .limit(1);
      if (salesErr) { logStep("sales query error", { error: salesErr.message }); continue; }
      if (!sales || sales.length === 0) { logStep("no linked sale", { clientOrgId }); summary.no_sale++; continue; }
      const sale = sales[0];

      const updatePayload: Record<string, any> = {
        recurring_status: "active",
        next_renewal_date: subscriptionRenewalDate || periodEnd,
        last_renewal_date: paymentDate,
      };
      if (recurringTotal > 0) updatePayload.recurring_value = recurringTotal;
      const { error: saleUpdateErr } = await supabase.from("sales").update(updatePayload).eq("id", sale.id);
      if (saleUpdateErr) logStep("sale update error", { error: saleUpdateErr.message });

      // Commission (same rules and dedupe key as the webhook)
      if (sale.created_by) {
        const { data: existingCommission } = await supabase
          .from("stripe_commission_records")
          .select("id")
          .eq("stripe_invoice_id", invoice.id)
          .limit(1);
        if (!existingCommission || existingCommission.length === 0) {
          const { data: orgSettings } = await supabase
            .from("organizations")
            .select("sales_settings")
            .eq("id", SENVIA_AGENCY_ORG_ID)
            .maybeSingle();
          const globalRate = orgSettings?.sales_settings?.commission_percentage || 0;
          const { data: member } = await supabase
            .from("organization_members")
            .select("commission_rate")
            .eq("organization_id", SENVIA_AGENCY_ORG_ID)
            .eq("user_id", sale.created_by)
            .eq("is_active", true)
            .maybeSingle();
          const rate = globalRate > 0 ? globalRate : Number(member?.commission_rate || 0);
          if (rate > 0) {
            const periodStart = invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString().split("T")[0]
              : null;
            const { error: commissionErr } = await supabase.from("stripe_commission_records").insert({
              organization_id: SENVIA_AGENCY_ORG_ID,
              sale_id: sale.id,
              user_id: sale.created_by,
              client_org_id: clientOrgId,
              amount,
              commission_rate: rate,
              commission_amount: amount * (rate / 100),
              stripe_invoice_id: invoice.id,
              period_start: periodStart,
              period_end: periodEnd,
              plan,
              status: "pending",
            });
            if (commissionErr) logStep("commission insert error", { error: commissionErr.message });
          }
        }
      }

      // Net amount from the balance transaction (card fee + Stripe Billing fee)
      let netAmount = amount;
      let stripeFee = 0;
      try {
        let { chargeId, piId } = invoiceChargeIds(invoice);
        if (!chargeId && !piId) {
          // List responses don't carry charge/payment_intent on newer API
          // versions — refetch the single invoice with payments expanded.
          const full = await stripeGet(`/invoices/${invoice.id}`, stripeKey, { "expand[]": "payments" });
          ({ chargeId, piId } = invoiceChargeIds(full));
        }
        let charge: any = null;
        if (chargeId) {
          charge = await stripeGet(`/charges/${chargeId}`, stripeKey, { "expand[]": "balance_transaction" });
        } else if (piId) {
          const pi = await stripeGet(`/payment_intents/${piId}`, stripeKey, { "expand[]": "latest_charge.balance_transaction" });
          charge = pi.latest_charge;
        }
        let bt: any = charge && typeof charge !== "string" ? charge.balance_transaction : null;
        if (typeof bt === "string") bt = await stripeGet(`/balance_transactions/${bt}`, stripeKey);
        if (bt) {
          const cardFee = (bt.fee || 0) / 100;
          const billingFee = round2(amount * BILLING_FEE_RATE);
          stripeFee = round2(cardFee + billingFee);
          netAmount = round2(amount - stripeFee);
        }
      } catch (e) {
        logStep("could not fetch net amount, using gross", { error: (e as Error).message });
      }

      const planLabel = plan ? PLAN_LIST_NAMES[plan] || plan : "subscription";
      const feeNote = stripeFee > 0 ? ` · bruto ${amount.toFixed(2)}€, taxa ${stripeFee.toFixed(2)}€` : "";
      const { error: paymentErr } = await supabase.from("sale_payments").insert({
        organization_id: SENVIA_AGENCY_ORG_ID,
        sale_id: sale.id,
        amount: netAmount,
        payment_date: paymentDate,
        status: "paid",
        payment_method: "card",
        notes: `Stripe ${planLabel} · ${invoice.id}${feeNote} (reconciliado)`,
      });
      if (paymentErr) {
        logStep("payment insert error", { error: paymentErr.message });
        continue;
      }

      logStep("recovered missed payment", { invoice: invoice.id, email, amount, netAmount });
      summary.recorded.push({
        invoice_id: invoice.id,
        email,
        client_org_id: clientOrgId,
        sale_id: sale.id,
        amount,
        net_amount: netAmount,
        payment_date: paymentDate,
      });
    }

    logStep("Done", {
      scanned: summary.scanned,
      recorded: summary.recorded.length,
      already_recorded: summary.already_recorded,
    });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
