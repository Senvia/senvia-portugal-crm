import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U0wAc7Tuy8w6gA": "starter",
  "prod_U0wGoA4odOBHOZ": "pro",
  "prod_U0wG6doz0zgZFV": "elite",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response("Invalid signature", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const email = session.customer_email || session.customer_details?.email;
        if (!email) { logStep("No email in checkout session"); break; }
        const subId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subId);
        const productId = sub.items.data[0].price.product as string;
        const plan = PRODUCT_TO_PLAN[productId];
        if (plan) await updateOrgPlan(supabase, email, plan);
        // Clear payment_failed_at on successful checkout
        await clearPaymentFailed(supabase, email);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const productId = sub.items.data[0].price.product as string;
        const plan = PRODUCT_TO_PLAN[productId];
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (plan && email) await updateOrgPlan(supabase, email, plan);

        // If subscription is past_due, record payment failure
        if (sub.status === "past_due" && email) {
          await recordPaymentFailed(supabase, email);
        }
        // If subscription is active again, clear payment failure
        if (sub.status === "active" && email) {
          await clearPaymentFailed(supabase, email);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (email) {
          await updateOrgPlan(supabase, email, null);
          await clearPaymentFailed(supabase, email);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;
        logStep("Payment failed", { customer: invoice.customer, email });
        if (email) {
          await recordPaymentFailed(supabase, email);
        }
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("Processing error", { error: (err as Error).message });
    return new Response("Processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function findOrgByEmail(supabase: any, email: string) {
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { logStep("Error listing users", { error: listErr.message }); return null; }

  const user = users.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) { logStep("User not found", { email }); return null; }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) { logStep("No org membership found", { userId: user.id }); return null; }
  return member.organization_id;
}

async function updateOrgPlan(supabase: any, email: string, plan: string | null) {
  logStep("Updating org plan", { email, plan });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  const { error: updateErr } = await supabase
    .from("organizations")
    .update({ plan: plan || null })
    .eq("id", orgId);

  if (updateErr) {
    logStep("Failed to update plan", { error: updateErr.message });
  } else {
    logStep("Plan updated successfully", { orgId, plan });
  }
}

async function recordPaymentFailed(supabase: any, email: string) {
  logStep("Recording payment failure", { email });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  // Only set if not already set (preserve original failure date)
  const { error } = await supabase
    .from("organizations")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("id", orgId)
    .is("payment_failed_at", null);

  if (error) {
    logStep("Failed to record payment failure", { error: error.message });
  } else {
    logStep("Payment failure recorded", { orgId });
  }
}

async function clearPaymentFailed(supabase: any, email: string) {
  logStep("Clearing payment failure", { email });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  const { error } = await supabase
    .from("organizations")
    .update({ payment_failed_at: null })
    .eq("id", orgId);

  if (error) {
    logStep("Failed to clear payment failure", { error: error.message });
  } else {
    logStep("Payment failure cleared", { orgId });
  }
}
