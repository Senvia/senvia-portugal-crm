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

// Run work after the response is sent (Supabase edge runtime); fall back to a
// floating promise locally.
function runInBackground(p: Promise<unknown>): void {
  const er = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p);
  else p.catch(() => {});
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

// ---- AI task suggestions (fase 2) ----
// Classify the message with Gemini Flash: does it imply a concrete follow-up
// task (a promise by the agent, or a request by the customer)? If so, insert a
// SUGGESTED inbox_task — the user accepts/dismisses it in the conversation
// panel. Runs in background; never blocks the webhook response.
function suggestTaskFromMessage(
  admin: ReturnType<typeof createClient>,
  org: { id: string },
  event: any,
  channelMeta: Record<string, unknown> | null,
): void {
  runInBackground((async () => {
    try {
      if ((channelMeta as any)?.ai_tasks_enabled === false) return; // opt-out per org
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey) return;

      const content = String(event.content ?? '').trim();
      if (content.length < 15 || content.length > 1200) return; // noise filter
      const sender = event.conversation?.meta?.sender ?? {};
      const phone = String(sender.phone_number ?? '').replace(/\D/g, '');
      if (!phone) return; // groups / unknown contacts
      console.log('[ai-task] analyzing message for', phone, 'len', content.length);
      const incoming = event.message_type === 'incoming';

      // Cap + dedupe: at most 3 open suggestions per contact; skip repeated titles.
      const { data: existing } = await admin
        .from('inbox_tasks')
        .select('id, title, suggested')
        .eq('organization_id', org.id)
        .eq('phone_key', phone.slice(-9))
        .is('done_at', null);
      const openSuggestions = (existing ?? []).filter((t: any) => t.suggested);
      if (openSuggestions.length >= 3) return;

      // Gemini occasionally answers 503 (model overloaded) — walk down the
      // sibling models instead of dropping the suggestion.
      const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
      let aiRes: Response | null = null;
      for (const model of MODELS) {
        aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'És um assistente de CRM. Analisa UMA mensagem de WhatsApp de uma conversa comercial e decide se implica uma TAREFA concreta para o comercial. É tarefa quando: (1) o comercial promete algo ("amanhã envio-te", "vou verificar e digo"); (2) o cliente pede algo que exige ação ("consegues enviar-me o preço?"). NÃO é tarefa: saudações, agradecimentos, confirmações vagas ("ok", "combinado" sem ação), conversa social. Responde APENAS com JSON válido, sem markdown: {"tarefa": boolean, "titulo": string, "prazo_iso": string|null, "confianca": number}. titulo: imperativo curto em pt-PT (ex.: "Enviar proposta atualizada"). prazo_iso: data/hora ISO 8601 quando a mensagem indica prazo ("amanhã"→09:00, "até sexta"→sexta 18:00, "logo"→hoje 21:00); null se não indicar. confianca: 0 a 1.',
            },
            {
              role: 'user',
              content: `Mensagem ${incoming ? 'do CLIENTE' : 'do COMERCIAL (eu)'}: "${content}"\nAgora (Lisboa): ${new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' })}`,
            },
          ],
        }),
        });
        if (aiRes.ok) break;
        const errText = (await aiRes.text()).slice(0, 120);
        console.error(`[ai-task] ${model} failed:`, aiRes.status, errText);
        // Only overload/rate-limit warrants trying the next model.
        if (aiRes.status !== 503 && aiRes.status !== 429) return;
      }
      if (!aiRes || !aiRes.ok) return;
      const aiData = await aiRes.json();
      const raw = String(aiData?.choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '').trim();
      let out: any;
      try { out = JSON.parse(raw); } catch { console.error('[ai-task] bad JSON:', raw.slice(0, 150)); return; }
      console.log('[ai-task] verdict:', JSON.stringify(out).slice(0, 200));
      if (!out?.tarefa || Number(out.confianca ?? 0) < 0.75 || !out.titulo) return;

      const title = String(out.titulo).slice(0, 160);
      if ((existing ?? []).some((t: any) => norm(t.title) === norm(title))) return;

      let dueAt: string | null = null;
      if (out.prazo_iso) {
        const d = new Date(out.prazo_iso);
        if (!isNaN(d.getTime()) && d.getTime() > Date.now()) dueAt = d.toISOString();
      }

      const { error: insErr } = await admin.from('inbox_tasks').insert({
        organization_id: org.id,
        created_by: null, // null = sugerida pela IA
        suggested: true,
        source_message: content.slice(0, 300),
        conversation_id: event.conversation?.id ?? null,
        contact_phone: phone,
        contact_name: sender.name ?? null,
        title,
        due_at: dueAt,
      });
      if (insErr) console.error('[ai-task] insert failed:', insErr.message);
      else console.log('[ai-task] suggestion created:', title);
    } catch (e) {
      console.error('ai task suggestion failed:', e);
    }
  })());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return ok();

  try {
    const event = await req.json().catch(() => null);
    if (!event || event.event !== 'message_created') return ok();
    if (event.private) return ok();

    // Evolution injects connection-status messages via Chatwoot (message_type
    // 'incoming') from its bot contact. The real messages are emoji-prefixed
    // ("🚀 Connection successfully established!", "QRCode successfully generated!"),
    // so strip leading non-letters before matching (the old anchored regex never
    // matched and let them through to AI + push). These are noise AND the signal
    // for the flap guard below. Generic state words are matched only as the WHOLE
    // message, so a real customer text ("open tomorrow?") is never misclassified.
    const evoBody = String(event.content ?? '').replace(/^[^\p{L}]+/u, '').trim().toLowerCase();
    const isEvoStatus =
      evoBody.startsWith('connection successfully established') ||
      evoBody.startsWith('connection timeout') ||
      evoBody.startsWith('disconnected from whatsapp') ||
      evoBody.startsWith('qrcode successfully generated') ||
      evoBody.startsWith('qr code successfully generated') ||
      evoBody.startsWith('qrcode generation limit') ||
      evoBody.startsWith('waitingqrcode') ||
      evoBody.startsWith('qrread') ||
      // 'init' is an Evolution bot artifact (no customer sends exactly "init").
      // Deliberately NOT matching bare 'open'/'close'/'connecting' — a real
      // customer could text those, and we must not silently drop their message.
      evoBody === 'init';

    const accountId = event.account?.id;
    if (!accountId) return ok();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve which organization owns this Chatwoot account.
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, chatwoot_account_token, chatwoot_webhook_secret')
      .eq('chatwoot_account_id', accountId)
      .maybeSingle();
    if (!org) return ok();

    // AUTH: the webhook URL is registered with a per-org ?key=<secret>. Reject
    // forged calls (which could otherwise fire pushes, burn Gemini quota, or
    // trigger the auto-reply to an arbitrary number). Always answer 200 so a
    // genuine misconfiguration doesn't make Chatwoot disable the webhook.
    if (org.chatwoot_webhook_secret) {
      const key = new URL(req.url).searchParams.get('key');
      if (key !== org.chatwoot_webhook_secret) {
        console.warn('chatwoot-webhook: rejected call with bad/missing key for account', accountId);
        return ok({ ok: false, rejected: true });
      }
    }

    // IDEMPOTENCY: Chatwoot retries deliveries, so dedupe by message id to avoid
    // duplicate pushes / Gemini suggestions. First writer wins.
    const messageId = Number(event.id);
    if (messageId) {
      const { data: claimed } = await admin
        .from('chatwoot_processed_messages')
        .upsert({ account_id: accountId, message_id: messageId }, { onConflict: 'account_id,message_id', ignoreDuplicates: true })
        .select('message_id')
        .maybeSingle();
      if (!claimed) return ok({ ok: true, duplicate: true });
    }

    // ---- Evolution status messages (CONNECTION_UPDATE / QRCODE events) ----
    // Handle before the realtime broadcast so these never trigger an inbox refetch.
    // Also auto-resolve the Chatwoot conversation immediately so it never sits in
    // the Open queue — at 100 instances reconnecting every 20s this would saturate
    // Chatwoot. Channel resolution is still needed for the flap guard below.
    const inboxId = event.conversation?.inbox_id ?? event.inbox?.id ?? null;
    let channel: { id?: string; evolution_instance: string | null; metadata: unknown; assigned_user_ids?: string[] | null; needs_repair?: boolean } | null = null;
    // channelExact = resolved by the conversation's inbox id (not the fallback).
    // The flap guard ONLY acts on an exact match, so a status message we can't
    // attribute to a specific caixa can never disconnect the wrong one.
    let channelExact = false;
    if (inboxId != null) {
      const { data } = await admin
        .from('messaging_channels')
        .select('id, evolution_instance, metadata, assigned_user_ids, needs_repair')
        .eq('organization_id', org.id)
        .eq('chatwoot_inbox_id', inboxId)
        .maybeSingle();
      if (data) { channel = data; channelExact = true; }
    }
    if (!channel) {
      const { data } = await admin
        .from('messaging_channels')
        .select('id, evolution_instance, metadata, assigned_user_ids, needs_repair')
        .eq('organization_id', org.id)
        .eq('channel_type', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      channel = data;
    }

    const isFlappingEvent =
      evoBody.startsWith('connection successfully established') ||
      evoBody.startsWith('connection timeout') ||
      evoBody.startsWith('disconnected from whatsapp') ||
      evoBody.startsWith('qrcode generation limit');

    if (isEvoStatus) {
      // Auto-resolve the Chatwoot conversation so it disappears from the Open queue.
      const cwConvId = event.conversation?.id;
      if (cwConvId && org.chatwoot_account_token) {
        const cwBase = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
        try {
          await fetch(`${cwBase}/api/v1/accounts/${accountId}/conversations/${cwConvId}/toggle_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', api_access_token: org.chatwoot_account_token },
            body: JSON.stringify({ status: 'resolved' }),
          });
        } catch (e) { console.error('[evo-status] resolve failed', e); }
      }

      // ---- Flap guard: a dead WhatsApp session reconnects in a loop and floods
      // Chatwoot with status messages. Count them per caixa; on a confirmed
      // runaway, remove the broken Evolution instance and alert the org.
      // QR events are NOT counted: normal during legitimate connection setup.
      if (isFlappingEvent && channelExact && channel?.id && channel?.evolution_instance && !channel.needs_repair) {
        try {
          const { data: tripped } = await admin.rpc('bump_channel_flap', {
            p_channel_id: channel.id, p_window_seconds: 300, p_threshold: 15,
          });
          if (tripped) {
            console.warn('[flap-guard] runaway flap on', channel.evolution_instance, '— removing instance');
            const evoUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
            const evoKey = Deno.env.get('EVOLUTION_API_KEY') || '';
            try {
              await fetch(`${evoUrl}/instance/delete/${channel.evolution_instance}`, {
                method: 'DELETE', headers: { apikey: evoKey },
              });
            } catch (e) { console.error('[flap-guard] instance delete failed', e); }
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
                body: JSON.stringify({
                  organization_id: org.id,
                  title: '⚠️ Caixa WhatsApp desligada',
                  body: 'Uma caixa começou a falhar em ciclo e foi desligada automaticamente para proteger o sistema. Reconecte-a em Definições, Caixas de Entrada.',
                  url: '/settings',
                  tag: `flap-${channel.id}`,
                }),
              });
            } catch (e) { console.error('[flap-guard] alert failed', e); }
          }
        } catch (e) {
          console.error('[flap-guard] failed', e);
        }
      }
      return ok({ ok: true, evo_status: true });
    }

    // Realtime nudge: open Senvia inboxes subscribe to `inbox-<org>` and refetch
    // immediately, instead of waiting for the poll. Only for real messages.
    // We also ship the NORMALIZED message itself so the client can append it to
    // the open thread instantly (no Chatwoot round-trip); the client still runs a
    // debounced refetch afterwards to reconcile attachments/placeholders.
    try {
      const cwBase = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
      const absUrl = (u: unknown): string | null => {
        const s = u == null ? '' : String(u);
        if (!s) return null;
        return /^https?:\/\//i.test(s) ? s : `${cwBase}${s.startsWith('/') ? '' : '/'}${s}`;
      };
      const atts = (Array.isArray(event.attachments) ? event.attachments : []).map((a: any) => ({
        id: a?.id,
        file_type: a?.file_type ?? 'file',
        data_url: absUrl(a?.data_url),
        thumb_url: absUrl(a?.thumb_url),
        file_size: a?.file_size ?? null,
        extension: a?.extension ?? null,
      }));
      // Chatwoot webhook message_type is a STRING here (incoming/outgoing/...).
      const mt = String(event.message_type ?? '');
      const broadcastMessage = {
        id: event.id,
        content: String(event.content ?? ''),
        outgoing: mt === 'outgoing' || mt === 'template',
        is_activity: mt === 'activity',
        is_private: event.private === true,
        created_at: event.created_at ?? null,
        sender_name: event.sender?.name ?? null,
        status: event.status ?? null,
        wa_id: event.source_id ? String(event.source_id).replace(/^WAID:/i, '') : null,
        attachments: atts,
        content_type: event.content_type ?? null,
        email_from: null, email_to: null, email_cc: null, email_subject: null, email_html_body: null,
      };
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
              message: broadcastMessage,
            },
          }],
        }),
      });
    } catch (e) {
      console.error('realtime broadcast failed:', e);
    }

    // AI task suggestions — promises by the agent AND requests by the customer.
    suggestTaskFromMessage(admin, org, event, (channel?.metadata as Record<string, unknown>) ?? null);

    // Everything below (auto-reply + push notification) is for INCOMING only.
    if (event.message_type !== 'incoming') return ok();

    // ---- Out-of-hours auto-reply (configured in messaging_channels.metadata) ----
    try {
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

    // ---- Auto-assign: distribute new conversations round-robin among the caixa's
    // collaborators (only if unassigned and the caixa has members). ----
    const caixaMembers = Array.isArray(channel?.assigned_user_ids) ? channel!.assigned_user_ids! : [];
    try {
      const alreadyAssigned = event.conversation?.custom_attributes?.senvia_assigned_id;
      if (!alreadyAssigned && caixaMembers.length > 0 && channel?.id && event.conversation?.id) {
        const { data: assignee } = await admin.rpc('get_next_channel_assignee', { p_channel_id: channel.id });
        if (assignee) {
          const { data: prof } = await admin.from('profiles').select('full_name').eq('id', assignee).maybeSingle();
          const cwUrl = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
          if (cwUrl && org.chatwoot_account_token) {
            await fetch(
              `${cwUrl}/api/v1/accounts/${accountId}/conversations/${event.conversation.id}/custom_attributes`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', api_access_token: org.chatwoot_account_token },
                body: JSON.stringify({ custom_attributes: { senvia_assigned_id: assignee, senvia_assigned_name: prof?.full_name || '' } }),
              },
            );
          }
        }
      }
    } catch (e) {
      console.error('auto-assign failed:', e);
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
    // When the caixa has collaborators, notify only them; otherwise the whole org.
    const pushPayload: Record<string, unknown> = {
      organization_id: org.id,
      title: `💬 ${senderName}`,
      body: preview.slice(0, 140),
      url: '/inbox',
      // One notification per conversation: a newer message replaces the
      // previous notification instead of stacking.
      tag: `inbox-${event.conversation?.id ?? 'new'}`,
    };
    if (caixaMembers.length > 0) pushPayload.user_ids = caixaMembers;
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(pushPayload),
    });

    return ok();
  } catch (err) {
    console.error('chatwoot-webhook error:', err);
    // Always 200 — Chatwoot disables webhooks that keep failing.
    return ok({ ok: false });
  }
});
