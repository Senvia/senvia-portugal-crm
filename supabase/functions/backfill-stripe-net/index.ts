import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) => console.log(`[BACKFILL-STRIPE-NET] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

type NetFee = { ok: true; gross: number; net: number; fee: number } | { ok: false; reason: string };

const idOf = (v: any): string | null => (typeof v === "string" ? v : v?.id) || null;

// Resolve the Stripe fee + net for an invoice. Tries, in order: invoice.charge,
// invoice.payment_intent, invoice.payments[].payment.payment_intent (API basil),
// then the charge's balance_transaction (retrieving it if it's just an id).
async function getNetFee(stripe: Stripe, invoiceId: string): Promise<NetFee> {
  const invoice: any = await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] });
  const gross = (invoice.amount_paid || 0) / 100;

  let chargeId = idOf(invoice.charge);
  let piId = idOf(invoice.payment_intent);
  if (!chargeId && !piId && invoice.payments?.data?.length) {
    piId = idOf(invoice.payments.data[0]?.payment?.payment_intent);
  }

  let charge: any = null;
  if (chargeId) {
    charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
  } else if (piId) {
    const pi: any = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
    charge = pi.latest_charge;
  }
  if (!charge || typeof charge === "string") {
    return { ok: false, reason: `sem charge (invoice keys: ${Object.keys(invoice).join(",")})` };
  }

  let bt: any = charge.balance_transaction;
  if (typeof bt === "string") bt = await stripe.balanceTransactions.retrieve(bt);
  if (!bt) return { ok: false, reason: "sem balance_transaction" };

  return { ok: true, gross, net: (bt.net || 0) / 100, fee: (bt.fee || 0) / 100 };
}

// One-off: recompute already-recorded Stripe sale_payments to the NET amount
// actually received (gross minus Stripe fees). Idempotent — skips rows whose
// notes already mention the fee ("taxa").
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing env" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auto-recorded Stripe payments carry the invoice id ("... · in_XXX") in notes.
    // Skip ones already adjusted (notes contain "taxa").
    const { data: payments, error } = await supabase
      .from("sale_payments")
      .select("id, amount, notes")
      .ilike("notes", "%in\\_%")
      .not("notes", "ilike", "%taxa%");
    if (error) throw error;

    let updated = 0;
    const results: unknown[] = [];

    for (const p of payments || []) {
      const match = String(p.notes || "").match(/in_[A-Za-z0-9]+/);
      if (!match) continue;
      const invoiceId = match[0];
      try {
        const nf = await getNetFee(stripe, invoiceId);
        if (!nf.ok) { results.push({ invoiceId, skipped: nf.reason }); continue; }
        const newNotes = `${p.notes} · bruto ${nf.gross.toFixed(2)}€, taxa ${nf.fee.toFixed(2)}€`;
        const { error: upErr } = await supabase
          .from("sale_payments")
          .update({ amount: nf.net, notes: newNotes })
          .eq("id", p.id);
        if (upErr) { results.push({ invoiceId, error: upErr.message }); continue; }
        updated++;
        results.push({ invoiceId, gross: nf.gross, net: nf.net, fee: nf.fee });
      } catch (e) {
        results.push({ invoiceId, error: (e as Error).message });
      }
    }

    log("done", { updated });
    return new Response(JSON.stringify({ success: true, updated, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", { error: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
