import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fires a server-side Meta CAPI **Purchase** event when a sale tied to a lead is
// created. Invoked fire-and-forget by the `trg_meta_capi_purchase` trigger on the
// sales table (pg_net), which passes just the sale id. Everything sensitive (the
// per-org Conversions API token, the lead's click identifiers) is read here with
// the service role — never trusted from the request.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLACEHOLDER_EMAIL = "nao-fornecido@placeholder.local";
const PLACEHOLDER_PHONE = "000000000";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sale_id } = await req.json();
    if (!sale_id) {
      return new Response(JSON.stringify({ error: "Missing sale_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Sale (authoritative; also the idempotency guard) ---
    const { data: sale } = await supabase
      .from("sales")
      .select("id, organization_id, lead_id, total_value, meta_capi_purchase_sent_at")
      .eq("id", sale_id)
      .maybeSingle();

    if (!sale) {
      return new Response(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sale.meta_capi_purchase_sent_at) {
      return json({ skipped: "already_sent" });
    }
    if (!sale.lead_id || !(Number(sale.total_value) > 0)) {
      return json({ skipped: "no_lead_or_value" });
    }

    // --- Lead (click identifiers + matching data) ---
    const { data: lead } = await supabase
      .from("leads")
      .select("email, phone, custom_data")
      .eq("id", sale.lead_id)
      .maybeSingle();

    // --- Org (pixels + per-org token) ---
    const { data: org } = await supabase
      .from("organizations")
      .select("meta_pixels, meta_conversions_api_token, niche")
      .eq("id", sale.organization_id)
      .maybeSingle();

    const activePixels: Array<{ pixel_id: string; enabled: boolean }> = Array.isArray(org?.meta_pixels)
      ? (org!.meta_pixels as Array<{ pixel_id: string; enabled: boolean }>).filter((p) => p?.enabled && p?.pixel_id)
      : [];

    // Stamp regardless of whether we can send, so we never re-attempt this sale.
    const stamp = () =>
      supabase.from("sales").update({ meta_capi_purchase_sent_at: new Date().toISOString() }).eq("id", sale.id);

    if (activePixels.length === 0) {
      await stamp();
      return json({ skipped: "no_active_pixels" });
    }

    const cd = (lead?.custom_data ?? {}) as Record<string, unknown>;
    const fbclid = typeof cd.fbclid === "string" ? cd.fbclid : undefined;
    // Reconstruct the click id the same way the Lead event does at capture time.
    const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
    const fbp = typeof cd.fbp === "string" ? cd.fbp : undefined;
    const em = lead?.email && lead.email !== PLACEHOLDER_EMAIL ? lead.email : undefined;
    const ph = lead?.phone && lead.phone !== PLACEHOLDER_PHONE ? lead.phone : undefined;

    // No way to match this person to anyone — don't bother Meta with a blind event.
    if (!em && !ph && !fbc && !fbp) {
      await stamp();
      return json({ skipped: "no_identifiers" });
    }

    // Per-org token; meta-capi-event falls back to the global secret if undefined.
    const accessToken = org?.meta_conversions_api_token || undefined;

    const results = await Promise.allSettled(
      activePixels.map((pixel) =>
        fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            pixel_id: pixel.pixel_id,
            access_token: accessToken,
            event_name: "Purchase",
            event_id: sale.id, // stable → dedupes if a pixel-side event ever fires too
            user_data: { em, ph, fbc, fbp },
            custom_data: {
              value: Number(sale.total_value),
              currency: "EUR",
              content_category: org?.niche || "sale",
            },
          }),
        }).then((r) => r.ok),
      ),
    );

    await stamp();

    const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return json({ success: true, pixels: activePixels.length, sent });
  } catch (error) {
    console.error("meta-capi-purchase error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
