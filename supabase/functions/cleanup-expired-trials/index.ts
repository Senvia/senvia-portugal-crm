import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-TRIALS] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Guard: this function PERMANENTLY DELETES data for expired-trial orgs and must
  // not be publicly invokable. FAILS CLOSED: if CRON_SECRET isn't configured,
  // the request is rejected rather than silently skipping the check (the
  // previous `if (cronSecret) {...}` shape meant a forgotten/unset secret left
  // this endpoint wide open to anyone on the internet).
  {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "CRON_SECRET não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("key");
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting cleanup");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find organizations where trial ended more than 60 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    // CRITICAL: only orgs that NEVER paid (first_paid_at IS NULL) are eligible
    // for the trial-cleanup purge. Customers who have ever paid stay untouched
    // forever, even if a renewal lapses — those are handled by the "plan
    // expired" blocker on the frontend, not by this destructive cron.
    const { data: expiredOrgs, error: fetchError } = await supabaseClient
      .from('organizations')
      .select('id, name, trial_ends_at')
      .eq('billing_exempt', false)
      .is('first_paid_at', null)
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', cutoffDate.toISOString());

    if (fetchError) throw new Error(`Failed to fetch expired orgs: ${fetchError.message}`);
    if (!expiredOrgs || expiredOrgs.length === 0) {
      logStep("No expired organizations found");
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(`Found ${expiredOrgs.length} potentially expired orgs`);

    let deletedCount = 0;

    for (const org of expiredOrgs) {
      // Check for a Stripe subscription under ANY member's email. Checking only
      // the first member meant an org whose subscription sits under a colleague's
      // email looked like a dead trial and had all of its data deleted.
      // The status set is deliberately broad: trialing/past_due/unpaid all mean
      // "this is a customer", and none of them may be purged.
      const { data: members } = await supabaseClient
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('is_active', true);

      let hasSubscription = false;
      let lookupFailed = false;
      for (const member of members ?? []) {
        try {
          const { data: userData } = await supabaseClient.auth.admin.getUserById(member.user_id);
          const email = userData?.user?.email;
          if (!email) continue;
          const customers = await stripe.customers.list({ email, limit: 10 });
          for (const customer of customers.data) {
            for (const status of ["active", "trialing", "past_due", "unpaid"] as const) {
              const subs = await stripe.subscriptions.list({ customer: customer.id, status, limit: 1 });
              if (subs.data.length > 0) { hasSubscription = true; break; }
            }
            if (hasSubscription) break;
          }
          if (hasSubscription) break;
        } catch (e) {
          // A Stripe error must never be read as "no subscription" — that would
          // delete a paying customer's data. Treat it as unknown and skip.
          logStep(`Stripe lookup failed for a member of org ${org.id}`, { error: (e as Error).message });
          lookupFailed = true;
        }
      }

      if (hasSubscription) {
        logStep(`Org ${org.id} has a Stripe subscription, skipping`);
        continue;
      }
      if (lookupFailed) {
        logStep(`Org ${org.id} skipped: could not verify subscription status (failing safe)`);
        continue;
      }

      logStep(`Deleting data for org: ${org.id} (${org.name})`);

      // Delete all org data in order (respecting foreign keys)
      const tables = [
        'proposal_cpes', 'proposal_products', 'sale_items', 'sale_payments',
        'bank_account_transactions', 'credit_notes', 'invoices',
        'client_communications', 'cpes', 'calendar_events',
        'email_sends', 'email_campaigns', 'email_templates',
        'dashboard_widgets', 'forms', 'expenses', 'expense_categories',
        'client_list_members', 'client_lists',
        'proposals', 'sales', 'crm_clients', 'leads',
        'internal_requests', 'bank_accounts',
        'organization_invites', 'organization_members',
      ];

      let purgeFailed = false;
      for (const table of tables) {
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq('organization_id', org.id);
        if (error) {
          console.error(`[CLEANUP-EXPIRED-TRIALS] failed to delete from ${table} for org ${org.id}`, error.message);
          purgeFailed = true;
        }
      }

      // There is no transaction here, so deleting the organization row after a
      // partial purge leaves financial rows (sale_payments, invoices, credit
      // notes) orphaned against a nonexistent org. Stop and leave the org intact
      // for a human to look at instead.
      if (purgeFailed) {
        console.error(`[CLEANUP-EXPIRED-TRIALS] aborting deletion of org ${org.id}: child rows were not fully removed`);
        continue;
      }

      // Delete the organization itself
      const { error: deleteOrgError } = await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', org.id);

      if (deleteOrgError) {
        logStep(`Failed to delete org ${org.id}`, { error: deleteOrgError.message });
      } else {
        deletedCount++;
        logStep(`Successfully deleted org: ${org.id}`);
      }
    }

    logStep(`Cleanup complete. Deleted ${deletedCount} organizations.`);

    return new Response(JSON.stringify({ deleted: deletedCount }), {
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
