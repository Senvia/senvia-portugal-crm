import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRA_SEAT_PRICE = "price_1TncdBLWnA81DzXTh3crx8iN";

interface RequestBody {
  quantity?: number;
  organization_id?: string; // optional — for super admin purchasing on behalf of another org
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user and org from JWT
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If organization_id is provided and user is super admin, use that org
    const body: RequestBody = await req.json();
    let orgId: string | null = body.organization_id ?? null;

    if (orgId) {
      // Verify super admin
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", orgId)
        .single();

      if (!memberData || memberData.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Apenas administradores podem gerir utilizadores extra" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Use the user's current org from their profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      orgId = profile?.organization_id ?? null;
    }

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org data
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("plan, extra_seats, extra_seats_stripe_price_id, stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (orgErr || !org) {
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.plan === "elite") {
      return new Response(
        JSON.stringify({ error: "O plano Elite não precisa de utilizadores extra — tem utilizadores ilimitados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quantity = Math.max(0, body.quantity ?? 0);
    const currentExtra = org.extra_seats ?? 0;

    if (quantity === currentExtra) {
      return new Response(
        JSON.stringify({ message: "Nenhuma alteração necessária" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update org with new extra seats count
    const { error: updateErr } = await supabase
      .from("organizations")
      .update({
        extra_seats: quantity,
        extra_seats_stripe_price_id: quantity > 0 ? EXTRA_SEAT_PRICE : null,
      })
      .eq("id", orgId);

    if (updateErr) throw updateErr;

    // If org has a Stripe customer and subscription, update the subscription item
    if (org.stripe_customer_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        console.warn("No STRIPE_SECRET_KEY configured — extra seats updated but no Stripe sync");
        return new Response(
          JSON.stringify({
            message: "Utilizadores extra atualizados sem faturação Stripe",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripe = new Stripe(stripeKey);

      if (quantity > 0) {
        // Find or create subscription item
        const subscriptions = await stripe.subscriptions.list({
          customer: org.stripe_customer_id,
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const existingItem = sub.items.data.find(
            (item: any) => item.price.id === EXTRA_SEAT_PRICE
          );

          if (existingItem) {
            await stripe.subscriptionItems.update(existingItem.id, {
              quantity,
            });
          } else if (quantity > 0) {
            await stripe.subscriptionItems.create({
              subscription: sub.id,
              price: EXTRA_SEAT_PRICE,
              quantity,
            });
          }
        } else {
          // No subscription — return success (extra seats stored, billing will be handled by webhook on next upgrade)
          console.warn("No active subscription found for org", orgId);
        }
      } else {
        // Remove all extra seat subscription items
        const subscriptions = await stripe.subscriptions.list({
          customer: org.stripe_customer_id,
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const extraItems = sub.items.data.filter(
            (item: any) => item.price.id === EXTRA_SEAT_PRICE
          );

          for (const item of extraItems) {
            await stripe.subscriptionItems.del(item.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Utilizadores extra atualizados para ${quantity}`,
        quantity,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[buy-extra-seats] error", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Minimal Stripe client — only the methods we need
class Stripe {
  private key: string;
  constructor(key: string) { this.key = key; }

  async request(method: string, path: string, body?: any) {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
    return data;
  }

  subscriptions = {
    list: (params: any) => this.request("GET", `/subscriptions?${new URLSearchParams(params)}`),
  };

  subscriptionItems = {
    create: (params: any) => this.request("POST", "/subscription_items", params),
    update: (id: string, params: any) =>
      this.request("POST", `/subscription_items/${id}`, params),
    del: (id: string) => this.request("DELETE", `/subscription_items/${id}`),
  };
}
