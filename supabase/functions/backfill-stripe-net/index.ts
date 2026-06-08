import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) => console.log(`[BACKFILL-STRIPE-NET] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

// Resolve the Stripe fee + net for an invoice id, via its charge (or payment intent).
async function getNetFee(stripe: Stripe, invoiceId: string): Promise<{ gross: number; net: number; fee: number } | null> {
  const invoice = await stripe.invoices.retrieve(invoiceId);
  let chargeId = (invoice as any).charge as string | null;
  if (!chargeId && (invoice as any).payment_intent) {
    const pi = await stripe.paymentIntents.retrieve((invoice as any).payment_intent as string);
    chargeId = (pi.latest_charge as string) || null;
  }
  if (!chargeId) return null;
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
  const bt = charge.balance_transaction as Stripe.BalanceTransaction | string | null;
  if (!bt || typeof bt === "string") return null;
  return {
    gross: (invoice.amount_paid || 0) / 100,
    net: (bt.net || 0) / 100,
    fee: (bt.fee || 0) / 100,
  };
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
        if (!nf) { results.push({ invoiceId, skipped: "no balance transaction" }); continue; }
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
