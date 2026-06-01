import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U0wAc7Tuy8w6gA": "starter",
  "prod_U0wGoA4odOBHOZ": "pro",
  "prod_U0wG6doz0zgZFV": "elite",
};

// How long after the Stripe current_period_end the org keeps full access while
// the customer settles the renewal. Past this window, the plan-expired blocker
// shows up.
const GRACE_DAYS = 4;

// Lightweight Stripe API calls without the heavy SDK
async function stripeGet(path: string, key: string, params?: Record<string, string>) {
  const url = new URL(`https://api.stripe.com/v1${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
  });
  return res.json();
}

// Look for a subscription in any of the statuses that mean "this customer has
// already paid at some point" — active, trialing (managed by Stripe trial),
// past_due (failed renewal but still recoverable) and unpaid (final dunning
// state before cancellation). canceled and incomplete are NOT included.
const PAYER_STATUSES = ["active", "trialing", "past_due", "unpaid"];

async function findSubForEmail(email: string, key: string) {
  const customers = await stripeGet("/customers", key, { email, limit: "1" });
  if (!customers.data?.length) return null;
  const cid = customers.data[0].id;
  for (const status of PAYER_STATUSES) {
    const subs = await stripeGet("/subscriptions", key, { customer: cid, status, limit: "1" });
    if (subs.data?.length) return subs.data[0];
  }
  return null;
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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Get user's organization
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const orgId = memberData?.organization_id;

    let orgData: any = null;
    if (orgId) {
      const { data } = await supabase
        .from('organizations')
        .select('billing_exempt, trial_ends_at, payment_failed_at, first_paid_at, current_period_end')
        .eq('id', orgId)
        .maybeSingle();
      orgData = data;
    }

    // Billing exempt → elite, no checks at all
    if (orgData?.billing_exempt === true) {
      if (orgId) await supabase.from('organizations').update({ plan: 'elite' }).eq('id', orgId);
      return json({
        subscribed: true,
        plan_id: 'elite',
        product_id: null,
        subscription_end: null,
        billing_exempt: true,
        first_paid_at: orgData.first_paid_at ?? null,
      });
    }

    // Find subscription for user (active/trialing/past_due/unpaid)
    let subscription = await findSubForEmail(user.email, stripeKey);

    // If none for this user, check other org members
    if (!subscription && orgId) {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .neq('user_id', user.id);

      if (members?.length) {
        for (const m of members) {
          const { data: mu } = await supabase.auth.admin.getUserById(m.user_id);
          if (!mu?.user?.email) continue;
          subscription = await findSubForEmail(mu.user.email, stripeKey);
          if (subscription) break;
        }
      }
    }

    if (!subscription) {
      return json(buildTrialResponse(orgData));
    }

    const productId = subscription.items.data[0].price.product as string;
    const planId = PRODUCT_TO_PLAN[productId] || "starter";

    const periodEnd = subscription.current_period_end ?? subscription.items.data[0]?.current_period_end;
    const subscriptionEnd = (periodEnd && typeof periodEnd === "number" && periodEnd > 0)
      ? new Date(periodEnd * 1000).toISOString()
      : null;

    // Persist the renewal date + first-paid stamp so the cleanup cron, the
    // protected route and the blocker components have a single source of truth.
    if (orgId) {
      const orgUpdates: Record<string, any> = { plan: planId };
      if (subscriptionEnd) orgUpdates.current_period_end = subscriptionEnd;
      if (!orgData?.first_paid_at) {
        // First time we see this org with a sub in a payer status — stamp now.
        orgUpdates.first_paid_at = new Date().toISOString();
      }
      await supabase.from('organizations').update(orgUpdates).eq('id', orgId);
    }

    const status = subscription.status as string;
    const isHealthy = status === "active" || status === "trialing";
    const isOverdue = status === "past_due" || status === "unpaid";

    // Plan-expired: customer paid before but is currently overdue past the
    // grace window. The frontend uses this to render PaymentOverdueBlocker
    // (with the "renew your plan" copy — they're NOT a trial).
    const planExpired = isOverdue && subscriptionEnd
      ? (Date.now() - new Date(subscriptionEnd).getTime()) > GRACE_DAYS * 24 * 60 * 60 * 1000
      : false;

    return json({
      subscribed: isHealthy,
      plan_id: planId,
      product_id: productId,
      subscription_end: subscriptionEnd,
      status,
      payment_overdue: planExpired,
      plan_expired: planExpired,
      first_paid_at: orgData?.first_paid_at ?? new Date().toISOString(),
      current_period_end: subscriptionEnd,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function getLegacyPaymentOverdue(orgData: any) {
  if (!orgData?.payment_failed_at) return { payment_failed_at: null, payment_overdue: false };
  const failedAt = new Date(orgData.payment_failed_at);
  const overdue = (Date.now() - failedAt.getTime()) > 3 * 24 * 60 * 60 * 1000;
  return { payment_failed_at: orgData.payment_failed_at, payment_overdue: overdue };
}

// Builds the response for an org with no Stripe subscription found.
// Two distinct branches:
//   1. Already a paying customer (first_paid_at IS NOT NULL) — never re-treated
//      as trial; the absence of an active sub here means the plan ended.
//   2. Still in trial — uses trial_ends_at to compute days_remaining and
//      trial_expired.
function buildTrialResponse(orgData: any) {
  const po = getLegacyPaymentOverdue(orgData);

  // PAYING CUSTOMER FALL-OUT: previously paid, no live sub right now.
  // We treat as plan-expired (renew CTA), never as trial.
  if (orgData?.first_paid_at) {
    const periodEnd = orgData?.current_period_end ? new Date(orgData.current_period_end) : null;
    const planExpired = periodEnd
      ? (Date.now() - periodEnd.getTime()) > GRACE_DAYS * 24 * 60 * 60 * 1000
      : true;
    return {
      subscribed: false,
      plan_id: null,
      subscription_end: orgData?.current_period_end ?? null,
      on_trial: false,
      trial_expired: false,
      first_paid_at: orgData.first_paid_at,
      current_period_end: orgData.current_period_end ?? null,
      plan_expired: planExpired,
      payment_overdue: planExpired,
    };
  }

  // TRIAL CUSTOMER: never paid.
  if (!orgData?.trial_ends_at) {
    return {
      subscribed: false,
      plan_id: null,
      subscription_end: null,
      on_trial: false,
      trial_expired: true,
      first_paid_at: null,
      ...po,
    };
  }
  const diffMs = new Date(orgData.trial_ends_at).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diffMs / 86400000));
  if (diffMs > 0) {
    return {
      subscribed: false,
      plan_id: null,
      subscription_end: null,
      on_trial: true,
      trial_ends_at: orgData.trial_ends_at,
      days_remaining: days,
      trial_expired: false,
      first_paid_at: null,
      ...po,
    };
  }
  return {
    subscribed: false,
    plan_id: null,
    subscription_end: null,
    on_trial: false,
    trial_ends_at: orgData.trial_ends_at,
    days_remaining: 0,
    trial_expired: true,
    first_paid_at: null,
    ...po,
  };
}
