// chatwoot-webhook — receives Chatwoot account webhooks (message_created) and
// pushes a notification to the org's users when a WhatsApp message arrives.
// Registered automatically per account by chatwoot-inbox (ensureChatwootWebhook).
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ok(body: unknown = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Friendly preview for media messages.
const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Imagem',
  audio: '🎵 Mensagem de voz',
  video: '🎬 Vídeo',
  file: '📄 Documento',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return ok();

  try {
    const event = await req.json().catch(() => null);
    if (!event || event.event !== 'message_created') return ok();
    if (event.private) return ok();

    const accountId = event.account?.id;
    if (!accountId) return ok();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve which organization owns this Chatwoot account.
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, chatwoot_account_token')
      .eq('chatwoot_account_id', accountId)
      .maybeSingle();
    if (!org) return ok();

    // Realtime nudge FIRST (lowest latency): open Senvia inboxes subscribe to
    // `inbox-<org>` and refetch immediately, instead of waiting for the poll.
    // Fired for incoming AND outgoing (our sends mirror back via Evolution).
    try {
      await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          messages: [{
            topic: `inbox-${org.id}`,
            event: 'message',
            payload: {
              conversation_id: event.conversation?.id ?? null,
              incoming: event.message_type === 'incoming',
            },
          }],
        }),
      });
    } catch (e) {
      console.error('realtime broadcast failed:', e);
    }

    // Everything below (auto-reply + push notification) is for INCOMING only.
    if (event.message_type !== 'incoming') return ok();

    // ---- Out-of-hours auto-reply (configured in messaging_channels.metadata) ----
    try {
      const { data: channel } = await admin
        .from('messaging_channels')
        .select('evolution_instance, metadata')
        .eq('organization_id', org.id)
        .eq('channel_type', 'whatsapp')
        .maybeSingle();
      const ar = (channel?.metadata as any)?.auto_reply;
      if (ar?.enabled && ar?.message && channel?.evolution_instance) {
        // "Outside hours" = current Lisbon time NOT within [start, end).
        const lisbonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
        const minutes = lisbonNow.getHours() * 60 + lisbonNow.getMinutes();
        const [sh, sm] = String(ar.start ?? '09:00').split(':').map(Number);
        const [eh, em] = String(ar.end ?? '18:00').split(':').map(Number);
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        const insideHours = startMin <= endMin
          ? minutes >= startMin && minutes < endMin
          : minutes >= startMin || minutes < endMin; // overnight range
        const phone = String(
          event.conversation?.meta?.sender?.phone_number ?? event.sender?.phone_number ?? '',
        ).replace(/\D/g, '');
        // Only one auto-reply per conversation per 6h (tracked in custom attrs).
        const lastAuto = Number(event.conversation?.custom_attributes?.senvia_auto_replied_at ?? 0);
        const recentlyReplied = lastAuto > 0 && Date.now() - lastAuto < 6 * 3600 * 1000;

        if (!insideHours && phone && !recentlyReplied) {
          const evoUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
          const evoKey = Deno.env.get('EVOLUTION_API_KEY') || '';
          await fetch(`${evoUrl}/message/sendText/${channel.evolution_instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: evoKey },
            body: JSON.stringify({ number: phone, text: String(ar.message) }),
          });
          // Stamp the conversation so we don't auto-reply again for a while.
          const cwUrl = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
          if (cwUrl && org.chatwoot_account_token && event.conversation?.id) {
            await fetch(
              `${cwUrl}/api/v1/accounts/${accountId}/conversations/${event.conversation.id}/custom_attributes`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', api_access_token: org.chatwoot_account_token },
                body: JSON.stringify({ custom_attributes: { senvia_auto_replied_at: Date.now() } }),
              },
            );
          }
        }
      }
    } catch (e) {
      console.error('auto-reply failed:', e);
    }

    const senderName =
      event.conversation?.meta?.sender?.name ||
      event.sender?.name ||
      event.conversation?.meta?.sender?.phone_number ||
      'Novo contacto';

    const attachments = Array.isArray(event.attachments) ? event.attachments : [];
    const preview = String(event.content ?? '').trim()
      || (attachments[0] ? (MEDIA_LABELS[attachments[0].file_type] ?? '📎 Anexo') : 'Nova mensagem');

    // Reuse the existing push pipeline (VAPID web push to push_subscriptions).
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        organization_id: org.id,
        title: `💬 ${senderName}`,
        body: preview.slice(0, 140),
        url: '/inbox',
        // One notification per conversation: a newer message replaces the
        // previous notification instead of stacking.
        tag: `inbox-${event.conversation?.id ?? 'new'}`,
      }),
    });

    return ok();
  } catch (err) {
    console.error('chatwoot-webhook error:', err);
    // Always 200 — Chatwoot disables webhooks that keep failing.
    return ok({ ok: false });
  }
});
