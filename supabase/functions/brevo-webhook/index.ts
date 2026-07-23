import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 60 req/min per IP (Brevo sends bursts during campaigns).
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`brevo-webhook:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetAfterMs / 1000)) } });
    }

    // Webhook guard: Brevo posts unauthenticated. When BREVO_WEBHOOK_SECRET is set,
    // require it (via ?key= in the configured webhook URL, or an x-webhook-secret
    // header) so an attacker can't forge delivery/open/bounce/unsubscribe events.
    const webhookSecret = Deno.env.get("BREVO_WEBHOOK_SECRET");
    if (webhookSecret) {
      const provided = new URL(req.url).searchParams.get("key") || req.headers.get("x-webhook-secret");
      if (provided !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const event = payload.event;
    const messageId = payload["message-id"] || payload.messageId;

    if (!messageId || !event) {
      return new Response(JSON.stringify({ error: "Missing event or message-id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Brevo webhook: event=${event}, messageId=${messageId}`);

    const updateData: Record<string, any> = {};
    let onlyIfNull = false;

    switch (event) {
      case "delivered":
        updateData.status = "delivered";
        break;
      case "opened":
      case "unique_opened": {
        // Check for false positive: fetch the record's sent_at
        const { data: sendRecord } = await supabase
          .from("email_sends")
          .select("sent_at, opened_at")
          .eq("brevo_message_id", String(messageId))
          .maybeSingle();

        // Idempotency: skip if already opened
        if (sendRecord?.opened_at) {
          return new Response(JSON.stringify({ ok: true, skipped: "already_opened" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sendRecord?.sent_at) {
          const diffSeconds = (Date.now() - new Date(sendRecord.sent_at).getTime()) / 1000;
          if (diffSeconds < 120) {
            console.log(`Ignoring suspicious open: ${diffSeconds.toFixed(1)}s after send (messageId=${messageId})`);
            return new Response(JSON.stringify({ ok: true, skipped: "suspicious_open" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        updateData.opened_at = new Date().toISOString();
        onlyIfNull = true;
        break;
      }
      case "click":
        updateData.clicked_at = new Date().toISOString();
        onlyIfNull = true;
        break;
      case "hard_bounce":
      case "soft_bounce":
        updateData.status = "bounced";
        updateData.error_message = `${event}: ${payload.reason || ""}`;
        break;
      case "blocked":
        updateData.status = "blocked";
        updateData.error_message = payload.reason || "Blocked";
        break;
      case "spam":
        updateData.status = "spam";
        break;
      case "unsubscribed":
        updateData.status = "unsubscribed";
        break;
      default:
        console.log(`Unhandled event: ${event}`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let query = supabase
      .from("email_sends")
      .update(updateData)
      .eq("brevo_message_id", String(messageId));

    // Idempotency: for open/click events, only update if the timestamp field is still null
    if (onlyIfNull) {
      const field = 'opened_at' in updateData ? 'opened_at' : 'clicked_at';
      query = query.is(field, null);
    }

    const { error } = await query;

    if (error) {
      console.error("Error updating email_sends:", error);
      return new Response(JSON.stringify({ error: "Failed to update" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brevo webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
