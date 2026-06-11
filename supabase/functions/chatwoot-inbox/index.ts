// chatwoot-inbox — proxy between Senvia OS and the org's Chatwoot account.
// Hides the account token from the browser. Actions:
//   - list_conversations
//   - get_messages   { conversation_id }
//   - send_message   { conversation_id, content }
import {
  corsHeaders, json, getConfig, authOrgMember, getOrgChatwoot, chatwootFetch,
  instanceNameForOrg, evolutionFetch,
} from '../_shared/multicanal.ts';

interface NormalizedConversation {
  id: number;
  contact_name: string;
  contact_phone: string | null;
  contact_thumbnail: string | null;
  last_message: string | null;
  unread_count: number;
  status: string;
  channel: string | null;
  updated_at: number | null;
}

// Chatwoot thumbnails can be relative paths (/rails/...) — make them absolute.
function absoluteUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeConversation(c: any, base: string): NormalizedConversation {
  const sender = c?.meta?.sender || {};
  const messages = Array.isArray(c?.messages) ? c.messages : [];
  const last = messages[messages.length - 1];
  return {
    id: c?.id,
    contact_name: sender?.name || sender?.phone_number || 'Contacto',
    contact_phone: sender?.phone_number ?? null,
    contact_thumbnail: absoluteUrl(sender?.thumbnail, base),
    last_message: last?.content ?? null,
    unread_count: c?.unread_count ?? 0,
    status: c?.status ?? 'open',
    channel: c?.meta?.channel ?? null,
    updated_at: c?.last_activity_at ?? c?.timestamp ?? null,
  };
}

function normalizeMessage(m: any) {
  return {
    id: m?.id,
    content: m?.content ?? '',
    // Chatwoot message_type: 0 incoming, 1 outgoing, 2 activity, 3 template
    outgoing: m?.message_type === 1 || m?.message_type === 3,
    is_activity: m?.message_type === 2,
    created_at: m?.created_at ?? null,
    sender_name: m?.sender?.name ?? null,
    attachments: Array.isArray(m?.attachments) ? m.attachments : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    if (!cfg.chatwootUrl) return json({ error: 'Chatwoot não configurado' }, 500);

    const body = await req.json().catch(() => ({}));
    const { organization_id, action, conversation_id, content } = body;

    const auth = await authOrgMember(req, cfg, organization_id);
    if ('error' in auth) return auth.error;

    const cw = await getOrgChatwoot(auth.admin, organization_id);
    if (!cw) return json({ error: 'Esta organização ainda não tem WhatsApp ligado.' }, 409);

    const base = `/api/v1/accounts/${cw.accountId}`;

    if (action === 'list_conversations') {
      // Fetch all statuses across several pages so imported history (which lands
      // as "resolved") and older conversations also show up. Chatwoot pages by 25.
      const all: any[] = [];
      for (let page = 1; page <= 6; page++) {
        const res = await chatwootFetch(
          cfg, cw.token, `${base}/conversations?status=all&assignee_type=all&page=${page}`,
        );
        if (!res.ok) {
          if (page === 1) return json({ error: 'Falha ao carregar conversas' }, 502);
          break;
        }
        const data = await res.json();
        const payload = data?.data?.payload ?? data?.payload ?? [];
        all.push(...payload);
        if (payload.length < 25) break;
      }
      const normalized = all.map((c: any) => normalizeConversation(c, cfg.chatwootUrl));
      // Drop WhatsApp LID artifacts: contacts whose "phone" is actually a LID
      // (14+ digits, no real name) — these are duplicates of the real contact.
      const isLidArtifact = (c: NormalizedConversation) => {
        const digits = (c.contact_phone || '').replace(/\D/g, '');
        const nameIsNumber = /^[0-9+\s]+$/.test((c.contact_name || '').trim());
        return nameIsNumber && digits.length >= 14;
      };
      return json({ conversations: normalized.filter((c) => !isLidArtifact(c)) });
    }

    if (action === 'get_messages') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const res = await chatwootFetch(cfg, cw.token, `${base}/conversations/${conversation_id}/messages`);
      if (!res.ok) return json({ error: 'Falha ao carregar mensagens' }, 502);
      const data = await res.json();
      const payload = data?.payload ?? [];
      return json({ messages: payload.map(normalizeMessage) });
    }

    if (action === 'send_message') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      if (!content || !String(content).trim()) return json({ error: 'Mensagem vazia' }, 400);

      // Send OUTBOUND directly through Evolution (by the contact's phone number),
      // instead of relying on the Chatwoot -> Evolution relay. Imported
      // conversations have a broken contact_inbox.source_id (a random UUID) that
      // does not route back to WhatsApp, so the relay silently drops them. The
      // phone number is always correct, so this delivers for EVERY conversation.
      // Evolution mirrors the sent message back into Chatwoot, so it still shows
      // up in the inbox via the polling refetch.
      const convRes = await chatwootFetch(cfg, cw.token, `${base}/conversations/${conversation_id}`);
      if (!convRes.ok) return json({ error: 'Conversa não encontrada' }, 502);
      const conv = await convRes.json();
      const sender = conv?.meta?.sender ?? conv?.payload?.meta?.sender ?? {};
      const number = String(sender.phone_number ?? sender.identifier ?? '').replace(/\D/g, '');
      if (!number) return json({ error: 'Contacto sem número de telefone' }, 422);

      const instance = instanceNameForOrg(organization_id);
      const evoRes = await evolutionFetch(cfg, `/message/sendText/${instance}`, 'POST', {
        number,
        text: String(content),
      });
      if (!evoRes.ok) {
        console.error('Evolution send failed:', evoRes.status, await evoRes.text());
        return json({ error: 'Falha ao enviar para o WhatsApp' }, 502);
      }
      return json({ ok: true });
    }

    if (action === 'mark_read') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/update_last_seen`, 'POST',
      );
      return json({ ok: res.ok });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (err) {
    console.error('chatwoot-inbox error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
