import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

        // Check if reactivation before updating plan
        const orgId = await findOrgByEmail(supabase, email);
        let isReactivation = false;
        if (orgId) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("plan, payment_failed_at")
            .eq("id", orgId)
            .maybeSingle();
          isReactivation = !!(orgData?.plan || orgData?.payment_failed_at);
        }

        if (plan) await updateOrgPlan(supabase, email, plan);
        await clearPaymentFailed(supabase, email);

        const orgName = await getOrgNameByEmail(supabase, email);

        if (isReactivation) {
          await dispatchAutomation(supabase, "stripe_subscription_created", { email, plan: plan || "unknown", nome: orgName });
        }
        if (plan) {
          await dispatchAutomation(supabase, `stripe_welcome_${plan}`, { email, plan, nome: orgName });
        }

        // Sync auto-lists: add to plan list, remove from overdue & canceled
        await syncStripeAutoLists(supabase, email, orgName, "checkout_completed", plan || null);
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

        if (email) {
          const orgName = await getOrgNameByEmail(supabase, email);

          if (sub.status === "past_due") {
            await recordPaymentFailed(supabase, email);
            await dispatchAutomation(supabase, "stripe_subscription_past_due", { email, plan: plan || "unknown", nome: orgName });
            await syncStripeAutoLists(supabase, email, orgName, "past_due", plan || null);
          }
          if (sub.status === "active") {
            await clearPaymentFailed(supabase, email);
            await dispatchAutomation(supabase, "stripe_subscription_renewed", { email, plan: plan || "unknown", nome: orgName });
            await syncStripeAutoLists(supabase, email, orgName, "renewed", plan || null);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const productId = sub.items.data[0].price.product as string;
        const plan = PRODUCT_TO_PLAN[productId];
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (email) {
          await updateOrgPlan(supabase, email, null);
          await clearPaymentFailed(supabase, email);
          const orgName = await getOrgNameByEmail(supabase, email);
          await dispatchAutomation(supabase, "stripe_subscription_canceled", { email, plan: plan || "unknown", nome: orgName });
          await syncStripeAutoLists(supabase, email, orgName, "canceled", plan || null);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;
        logStep("Payment failed", { customer: invoice.customer, email });
        if (email) {
          await recordPaymentFailed(supabase, email);
          const orgName = await getOrgNameByEmail(supabase, email);
          await dispatchAutomation(supabase, "stripe_payment_failed", { email, plan: "unknown", nome: orgName });
          await syncStripeAutoLists(supabase, email, orgName, "payment_failed", null);
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

// --- Stripe Auto-Lists Sync ---

type ListEventType = "checkout_completed" | "renewed" | "past_due" | "payment_failed" | "canceled";

async function syncStripeAutoLists(
  supabase: any,
  email: string,
  name: string,
  eventType: ListEventType,
  plan: string | null
) {
  try {
    logStep("Syncing Stripe auto-lists", { email, eventType, plan });

    // 1. Ensure lists exist
    await supabase.rpc("ensure_stripe_auto_lists", { p_org_id: SENVIA_AGENCY_ORG_ID });

    // 2. Upsert marketing contact
    const { data: contact, error: contactErr } = await supabase
      .from("marketing_contacts")
      .upsert(
        { organization_id: SENVIA_AGENCY_ORG_ID, email, name: name || email, source: "stripe", subscribed: true },
        { onConflict: "organization_id,email" }
      )
      .select("id")
      .single();

    if (contactErr || !contact) {
      logStep("Failed to upsert marketing contact", { error: contactErr?.message });
      return;
    }
    const contactId = contact.id;

    // 3. Get all Stripe system list IDs
    const { data: lists } = await supabase
      .from("client_lists")
      .select("id, name")
      .eq("organization_id", SENVIA_AGENCY_ORG_ID)
      .eq("is_system", true)
      .in("name", ["Plano Starter", "Plano Pro", "Plano Elite", "Pagamento em Atraso", "Subscrição Cancelada", "Clientes em Trial", "Trial Expirado"]);

    if (!lists || lists.length === 0) {
      logStep("No Stripe auto-lists found");
      return;
    }

    const listMap: Record<string, string> = {};
    for (const l of lists) listMap[l.name] = l.id;

    const planListIds = [listMap["Plano Starter"], listMap["Plano Pro"], listMap["Plano Elite"]].filter(Boolean);
    const overdueListId = listMap["Pagamento em Atraso"];
    const canceledListId = listMap["Subscrição Cancelada"];
    const trialListId = listMap["Clientes em Trial"];
    const trialExpiredListId = listMap["Trial Expirado"];
    const currentPlanListId = plan ? listMap[PLAN_LIST_NAMES[plan]] : null;

    // Helper: add to list
    const addToList = async (listId: string) => {
      if (!listId) return;
      await supabase.from("marketing_list_members").upsert(
        { list_id: listId, contact_id: contactId },
        { onConflict: "list_id,contact_id" }
      );
    };

    // Helper: remove from list
    const removeFromList = async (listId: string) => {
      if (!listId) return;
      await supabase.from("marketing_list_members")
        .delete()
        .eq("list_id", listId)
        .eq("contact_id", contactId);
    };

    // Helper: remove from multiple lists
    const removeFromLists = async (listIds: string[]) => {
      for (const id of listIds) await removeFromList(id);
    };

    switch (eventType) {
      case "checkout_completed":
      case "renewed":
        // Add to current plan list
        if (currentPlanListId) await addToList(currentPlanListId);
        // Remove from other plan lists (upgrade/downgrade)
        for (const id of planListIds) {
          if (id !== currentPlanListId) await removeFromList(id);
        }
        // Remove from overdue, canceled & trial lists
        if (overdueListId) await removeFromList(overdueListId);
        if (canceledListId) await removeFromList(canceledListId);
        if (trialListId) await removeFromList(trialListId);
        if (trialExpiredListId) await removeFromList(trialExpiredListId);
        break;

      case "past_due":
      case "payment_failed":
        // Add to overdue
        if (overdueListId) await addToList(overdueListId);
        break;

      case "canceled":
        // Remove from all plan lists
        await removeFromLists(planListIds);
        // Remove from overdue
        if (overdueListId) await removeFromList(overdueListId);
        // Add to canceled
        if (canceledListId) await addToList(canceledListId);
        break;
    }

    logStep("Auto-lists synced successfully", { eventType, plan });
  } catch (err) {
    logStep("Auto-lists sync failed", { error: (err as Error).message });
  }
}

// --- Helper functions ---

async function dispatchAutomation(supabase: any, triggerType: string, record: Record<string, string>) {
  try {
    logStep("Dispatching automation", { triggerType, record });
    const { error } = await supabase.functions.invoke("process-automation", {
      body: {
        trigger_type: triggerType,
        organization_id: SENVIA_AGENCY_ORG_ID,
        record,
      },
    });
    if (error) logStep("Automation dispatch error", { error: error.message });
    else logStep("Automation dispatched", { triggerType });
  } catch (err) {
    logStep("Automation dispatch failed", { error: (err as Error).message });
  }
}

async function getOrgNameByEmail(supabase: any, email: string): Promise<string> {
  try {
    const orgId = await findOrgByEmail(supabase, email);
    if (!orgId) return "";
    const { data } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
    return data?.name || "";
  } catch {
    return "";
  }
}

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
