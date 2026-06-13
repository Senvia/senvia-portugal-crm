// chatwoot-inbox — proxy between Senvia OS and the org's Chatwoot account.
// Hides the account token from the browser. Actions:
//   - list_conversations
//   - search                { q }
//   - get_messages          { conversation_id | conversation_ids, before? }
//   - send_message          { conversation_id, content?, contact_phone?, quoted_id?, attachment? }
//   - send_note             { conversation_id, content }   (private, agent-only)
//   - start_conversation    { phone, content }
//   - toggle_status         { conversation_id, status: 'open' | 'resolved' }
//   - assign_conversation   { conversation_id, user_id, user_name }
//   - rename_contact        { contact_id, name }
//   - list_labels / create_label { title } / set_labels { conversation_id, labels } / delete_label { label_id }
//   - list_canned / create_canned { content } / delete_canned { canned_id }
//   - delete_message        { wa_id, phone }
//   - mark_read             { conversation_id | conversation_ids }
//   - download_attachment   { url }
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders, json, getConfig, authOrgMember, getOrgChatwoot, chatwootFetch,
  instanceNameForOrg, evolutionFetch,
} from '../_shared/multicanal.ts';

interface NormalizedConversation {
  id: number;
  alt_ids: number[];
  contact_id: number | null;
  contact_name: string;
  contact_phone: string | null;
  // Identity for channels without a phone number (Instagram / Messenger / email).
  contact_email: string | null;
  contact_identifier: string | null;
  contact_thumbnail: string | null;
  last_message: string | null;
  unread_count: number;
  status: string;
  channel: string | null;
  // Chatwoot inbox id — identifies which connected account/number this belongs to
  // (multi-account routing for outbound sends).
  inbox_id: number | null;
  updated_at: number | null;
  // Set when the LAST message is from the customer (they're waiting on us).
  waiting_since: number | null;
  labels: string[];
  assigned_id: string | null;
  assigned_name: string | null;
}

// Chatwoot thumbnails can be relative paths (/rails/...) — make them absolute.
function absoluteUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Imported history stores media as text placeholders (the media itself was not
// imported) — show a friendly label instead of the raw "_<Image Message>_".
const MEDIA_PLACEHOLDERS: Record<string, string> = {
  'image': '📷 Imagem',
  'audio': '🎵 Áudio',
  'video': '🎬 Vídeo',
  'document': '📄 Documento',
  'file': '📄 Documento',
  'sticker': '💟 Sticker',
};

function prettyContent(content: string | null): string | null {
  if (!content) return content;
  const m = content.match(/^_?<(\w+) Message>_?$/i);
  if (m) return MEDIA_PLACEHOLDERS[m[1].toLowerCase()] ?? '📎 Anexo';
  return content;
}

function normalizeConversation(c: any, base: string): NormalizedConversation {
  const sender = c?.meta?.sender || {};
  const messages = Array.isArray(c?.messages) ? c.messages : [];
  // Prefer the last REAL message for the preview (skip Chatwoot activity/system
  // messages, message_type 2). But the list window often contains ONLY the last
  // message — if that is an activity, filtering would leave nothing, so fall
  // back to the actual last message and let the client translate it to pt-PT.
  const realMessages = messages.filter((m: any) => m?.message_type !== 2);
  const last = realMessages[realMessages.length - 1] ?? messages[messages.length - 1];
  // Media messages have no text — show the type label ("🎵 Áudio") in the
  // list preview instead of an empty dash, WhatsApp-style.
  let lastMessage = prettyContent(last?.content ?? null);
  if (!lastMessage && Array.isArray(last?.attachments) && last.attachments.length > 0) {
    const ft = String(last.attachments[0]?.file_type ?? 'file');
    lastMessage = MEDIA_PLACEHOLDERS[ft] ?? '📎 Anexo';
  }
  const custom = c?.custom_attributes ?? {};
  return {
    id: c?.id,
    alt_ids: [],
    contact_id: sender?.id ?? null,
    contact_name: sender?.name || sender?.phone_number || sender?.email || 'Contacto',
    contact_phone: sender?.phone_number ?? null,
    contact_email: sender?.email ?? null,
    contact_identifier: sender?.identifier ?? null,
    contact_thumbnail: absoluteUrl(sender?.thumbnail, base),
    last_message: lastMessage,
    unread_count: c?.unread_count ?? 0,
    status: c?.status ?? 'open',
    channel: c?.meta?.channel ?? null,
    inbox_id: c?.inbox_id ?? null,
    updated_at: c?.last_activity_at ?? c?.timestamp ?? null,
    waiting_since: last && last.message_type === 0 ? (last.created_at ?? null) : null,
    labels: Array.isArray(c?.labels) ? c.labels : [],
    // Empty string = cleared assignment (Chatwoot drops null on merge, so we
    // store "" to remove instead of null).
    assigned_id: custom.senvia_assigned_id || null,
    assigned_name: custom.senvia_assigned_name || null,
    // Manual CRM link (overrides the phone-based auto-match). kind: lead | client.
    crm_kind: custom.senvia_crm_kind || null,
    crm_id: custom.senvia_crm_id || null,
    crm_name: custom.senvia_crm_name || null,
  };
}

// Hide WhatsApp groups (sending by phone number cannot route to a group) and
// LID artifacts (duplicate contacts whose "phone" is a long internal id).
function isHiddenConversation(c: any, normalized: NormalizedConversation): boolean {
  const identifier = String(c?.meta?.sender?.identifier ?? '');
  if (identifier.includes('@g.us')) return true;
  const digits = (normalized.contact_phone || '').replace(/\D/g, '');
  const nameIsNumber = /^[0-9+\s]+$/.test((normalized.contact_name || '').trim());
  return nameIsNumber && digits.length >= 14;
}

// The same contact can end up with several Chatwoot conversations (imported
// history + live, LID artifacts...). Merge them into one row per phone — the
// newest conversation is the primary; the rest become alt_ids whose messages
// the client merges into one thread.
function mergeByContact(sorted: NormalizedConversation[]): NormalizedConversation[] {
  const byPhone = new Map<string, NormalizedConversation>();
  const out: NormalizedConversation[] = [];
  for (const c of sorted) {
    const key = (c.contact_phone || '').replace(/\D/g, '');
    if (!key) {
      out.push(c);
      continue;
    }
    const primary = byPhone.get(key);
    if (!primary) {
      byPhone.set(key, c);
      out.push(c);
    } else {
      primary.alt_ids.push(c.id);
      primary.unread_count += c.unread_count || 0;
      // If any of the merged conversations is open, the contact is active.
      if (primary.status === 'resolved' && c.status !== 'resolved') primary.status = c.status;
      if (!primary.assigned_id && c.assigned_id) {
        primary.assigned_id = c.assigned_id;
        primary.assigned_name = c.assigned_name;
      }
      primary.labels = [...new Set([...primary.labels, ...c.labels])];
    }
  }
  return out;
}

function normalizeMessage(m: any, base: string) {
  const attachments = (Array.isArray(m?.attachments) ? m.attachments : []).map((a: any) => ({
    id: a?.id,
    file_type: a?.file_type ?? 'file',
    data_url: absoluteUrl(a?.data_url, base),
    thumb_url: absoluteUrl(a?.thumb_url, base),
    file_size: a?.file_size ?? null,
    extension: a?.extension ?? null,
  }));
  // When the real attachment exists, drop the "_<Image Message>_" placeholder so
  // the bubble shows only the media; keep the pretty label for imported history
  // (text-only import, no attachment to render).
  const rawContent = m?.content ?? '';
  const isPlaceholder = /^_?<\w+ Message>_?$/i.test(rawContent);
  const content = attachments.length > 0 && isPlaceholder ? '' : prettyContent(rawContent);
  return {
    id: m?.id,
    content,
    // Chatwoot message_type: 0 incoming, 1 outgoing, 2 activity, 3 template
    outgoing: m?.message_type === 1 || m?.message_type === 3,
    is_activity: m?.message_type === 2,
    // Private note: agent-only, never delivered to the customer's WhatsApp.
    is_private: m?.private === true,
    created_at: m?.created_at ?? null,
    sender_name: m?.sender?.name ?? null,
    // Delivery status of outgoing messages: sent | delivered | read | failed.
    status: m?.status ?? null,
    // WhatsApp message id (WAID: prefix stripped) — used to quote/reply/delete.
    wa_id: m?.source_id ? String(m.source_id).replace(/^WAID:/i, '') : null,
    attachments,
  };
}

// Ensure the org's Chatwoot account has a webhook pointing at our
// chatwoot-webhook function (push notifications for incoming messages).
// The URL carries a per-org secret (?key=<secret>) so the webhook can reject
// forged calls. Any previously-registered webhook for our function with a wrong
// or missing key is removed. Memoized per account for the edge instance lifetime.
const webhookEnsured = new Set<number>();
async function ensureChatwootWebhook(
  cfg: ReturnType<typeof getConfig>,
  token: string,
  accountId: number,
): Promise<void> {
  if (webhookEnsured.has(accountId)) return;
  webhookEnsured.add(accountId);
  try {
    // Resolve the org's webhook secret (service role).
    const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);
    const { data: org } = await admin
      .from('organizations')
      .select('chatwoot_webhook_secret')
      .eq('chatwoot_account_id', accountId)
      .maybeSingle();
    const secret = (org as { chatwoot_webhook_secret?: string } | null)?.chatwoot_webhook_secret;
    if (!secret) return; // migration not applied yet — don't register a keyless hook

    const baseHookUrl = `${cfg.supabaseUrl}/functions/v1/chatwoot-webhook`;
    const desiredUrl = `${baseHookUrl}?key=${secret}`;
    const base = `/api/v1/accounts/${accountId}`;
    const listRes = await chatwootFetch(cfg, token, `${base}/webhooks`);
    if (!listRes.ok) return;
    const data = await listRes.json();
    // Chatwoot wraps the list: { payload: { webhooks: [...] } } (older builds
    // return the array directly) — normalize before checking.
    const raw = data?.payload?.webhooks ?? data?.payload ?? data;
    const hooks: any[] = Array.isArray(raw) ? raw : [];
    let hasDesired = false;
    for (const h of hooks) {
      const url = String(h?.url ?? h?.webhook?.url ?? '');
      const id = h?.id ?? h?.webhook?.id;
      if (url === desiredUrl) { hasDesired = true; continue; }
      // Remove stale hooks for our function (keyless or wrong/rotated key).
      if (id && url.startsWith(baseHookUrl)) {
        await chatwootFetch(cfg, token, `${base}/webhooks/${id}`, 'DELETE').catch(() => {});
      }
    }
    if (hasDesired) return;
    await chatwootFetch(cfg, token, `${base}/webhooks`, 'POST', {
      webhook: { url: desiredUrl, subscriptions: ['message_created'] },
    });
  } catch (e) {
    console.error('ensureChatwootWebhook failed:', e);
    webhookEnsured.delete(accountId);
  }
}

// Map a client attachment kind to the Evolution sendMedia mediatype.
const MEDIA_TYPES: Record<string, string> = {
  image: 'image',
  video: 'video',
  document: 'document',
};

// Org -> Chatwoot creds cache (60s TTL): saves a DB round trip on EVERY call.
// Auth still runs per request — this only caches the org's account id + token.
const orgCwCache = new Map<string, { v: { accountId: number; token: string }; at: number }>();
async function getOrgChatwootCached(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
): Promise<{ accountId: number; token: string } | null> {
  const hit = orgCwCache.get(organizationId);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  const v = await getOrgChatwoot(admin, organizationId);
  if (v) orgCwCache.set(organizationId, { v, at: Date.now() });
  return v;
}

// Run work after the response is sent (Supabase edge runtime); fall back to a
// floating promise locally.
function runInBackground(p: Promise<unknown>): void {
  const er = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p);
  else p.catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    if (!cfg.chatwootUrl) return json({ error: 'Chatwoot não configurado' }, 500);

    const body = await req.json().catch(() => ({}));
    const { organization_id, action, conversation_id, content, contact_phone } = body;

    // Auth and Chatwoot-account lookup are independent — run them in parallel.
    // The cw result is only USED after auth passes, so this leaks nothing.
    const [auth, cw] = await Promise.all([
      authOrgMember(req, cfg, organization_id),
      getOrgChatwootCached(createClient(cfg.supabaseUrl, cfg.serviceKey), organization_id),
    ]);
    if ('error' in auth) return auth.error;
    if (!cw) return json({ error: 'Esta organização ainda não tem WhatsApp ligado.' }, 409);

    const base = `/api/v1/accounts/${cw.accountId}`;

    // Resolve the Evolution instance for THIS request's conversation by its
    // Chatwoot inbox (multi-account). Lazy + memoized so hot paths that don't send
    // (list_conversations) never pay the lookup. Falls back to the org's single /
    // legacy instance when the inbox can't be matched.
    let _instance: string | null = null;
    const getInstance = async (): Promise<string> => {
      if (_instance) return _instance;
      let inst = instanceNameForOrg(organization_id);
      const { data: chs } = await auth.admin
        .from('messaging_channels')
        .select('evolution_instance, chatwoot_inbox_id')
        .eq('organization_id', organization_id);
      if (chs && chs.length) {
        const inboxId = body.inbox_id != null ? Number(body.inbox_id) : null;
        const match = inboxId != null ? chs.find((c: any) => c.chatwoot_inbox_id === inboxId) : null;
        if (match?.evolution_instance) inst = match.evolution_instance;
        else if (chs.length === 1 && chs[0].evolution_instance) inst = chs[0].evolution_instance;
      }
      _instance = inst;
      return inst;
    };

    // ===== Per-caixa visibility =====
    // A caixa (messaging_channels) with assigned_user_ids restricts who sees its
    // conversations. Admins see everything; caixas with no assignees (or whose
    // Chatwoot inbox id we don't know yet) are visible to everyone (non-breaking).
    let _vis: { isAdmin: boolean; restricted: Map<number, Set<string>> } | null = null;
    const getVisibility = async () => {
      if (_vis) return _vis;
      const [{ data: member }, { data: superRole }, { data: chs }] = await Promise.all([
        auth.admin.from('organization_members').select('role').eq('organization_id', organization_id).eq('user_id', auth.userId).eq('is_active', true).maybeSingle(),
        auth.admin.from('user_roles').select('role').eq('user_id', auth.userId).eq('role', 'super_admin').maybeSingle(),
        auth.admin.from('messaging_channels').select('chatwoot_inbox_id, assigned_user_ids').eq('organization_id', organization_id),
      ]);
      const isAdmin = (member as { role?: string } | null)?.role === 'admin' || !!superRole;
      const restricted = new Map<number, Set<string>>();
      for (const c of (chs || []) as Array<{ chatwoot_inbox_id: number | null; assigned_user_ids: string[] | null }>) {
        if (c.chatwoot_inbox_id != null && Array.isArray(c.assigned_user_ids) && c.assigned_user_ids.length > 0) {
          restricted.set(Number(c.chatwoot_inbox_id), new Set(c.assigned_user_ids));
        }
      }
      _vis = { isAdmin, restricted };
      return _vis;
    };
    const canSee = (vis: { isAdmin: boolean; restricted: Map<number, Set<string>> }, inboxId: number | null | undefined) => {
      if (vis.isAdmin) return true;
      if (inboxId == null) return true;
      const allowed = vis.restricted.get(Number(inboxId));
      return !allowed || allowed.has(auth.userId);
    };

    // Account-level mutations (labels / canned responses affect the WHOLE org)
    // require admin — agents can use them but not create/delete them.
    const ADMIN_ACTIONS = new Set(['create_label', 'delete_label', 'create_canned', 'delete_canned']);
    if (ADMIN_ACTIONS.has(action)) {
      const [{ data: member }, { data: superRole }] = await Promise.all([
        auth.admin
          .from('organization_members')
          .select('role')
          .eq('organization_id', organization_id)
          .eq('user_id', auth.userId)
          .eq('is_active', true)
          .maybeSingle(),
        auth.admin
          .from('user_roles')
          .select('role')
          .eq('user_id', auth.userId)
          .eq('role', 'super_admin')
          .maybeSingle(),
      ]);
      if ((member as { role?: string } | null)?.role !== 'admin' && !superRole) {
        return json({ error: 'Apenas administradores podem gerir etiquetas e respostas rápidas.' }, 403);
      }
    }

    if (action === 'list_conversations') {
      // Fire-and-forget: make sure push notifications are wired for this account.
      ensureChatwootWebhook(cfg, cw.token, cw.accountId);

      // Chatwoot takes >1s PER page and serves few requests at once — 6 pages on
      // every poll was queueing the whole server ("loading forever"). Only the
      // FIRST load fetches deep (6 pages); refreshes fetch the 2 newest pages
      // (50 conversations by latest activity) and the client merges them into
      // its cached list.
      const pageNums = body.mode === 'fresh' ? [1, 2] : [1, 2, 3, 4, 5, 6];
      const pages = await Promise.all(
        pageNums.map(async (page) => {
          const res = await chatwootFetch(
            cfg, cw.token, `${base}/conversations?status=all&assignee_type=all&page=${page}`,
          );
          if (!res.ok) return page === 1 ? null : [];
          const data = await res.json();
          return data?.data?.payload ?? data?.payload ?? [];
        }),
      );
      if (pages[0] === null) return json({ error: 'Falha ao carregar conversas' }, 502);
      const all: any[] = pages.flatMap((p) => p ?? []);
      // Per-caixa visibility: hide conversations of restricted caixas the viewer
      // is not assigned to (admins see all).
      const vis = await getVisibility();
      // Newest activity first, always — Chatwoot page order is not guaranteed
      // across parallel pages. Merge duplicate conversations per contact.
      const sorted = all
        .map((c: any) => ({ raw: c, n: normalizeConversation(c, cfg.chatwootUrl) }))
        .filter(({ raw, n }) => !isHiddenConversation(raw, n) && canSee(vis, n.inbox_id))
        .map(({ n }) => n)
        .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
      return json({ conversations: mergeByContact(sorted) });
    }

    if (action === 'search') {
      const q = String(body.q ?? '').trim();
      if (q.length < 3) return json({ conversations: [] });
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return json({ conversations: [] });
      const data = await res.json();
      const payload = data?.payload ?? data?.data?.payload ?? [];
      const vis = await getVisibility();
      const normalized = payload
        .map((c: any) => ({ raw: c, n: normalizeConversation(c, cfg.chatwootUrl) }))
        .filter(({ raw, n }: any) => !isHiddenConversation(raw, n) && canSee(vis, n.inbox_id))
        .map(({ n }: any) => n);
      return json({ conversations: normalized });
    }

    if (action === 'get_messages') {
      const reqIds: number[] = Array.isArray(body.conversation_ids) && body.conversation_ids.length > 0
        ? body.conversation_ids.map(Number).filter(Boolean)
        : conversation_id ? [Number(conversation_id)] : [];
      if (reqIds.length === 0) return json({ error: 'conversation_id em falta' }, 400);

      // Block reading a restricted caixa the viewer can't access. For non-admins
      // with restricted caixas, resolve EACH conversation's inbox and drop the ones
      // they can't see (a contact can have threads across caixas; never leak one).
      const vis = await getVisibility();
      let ids = reqIds;
      if (!vis.isAdmin && vis.restricted.size > 0) {
        const checked = await Promise.all(reqIds.map(async (id) => {
          const r = await chatwootFetch(cfg, cw.token, `${base}/conversations/${id}`);
          if (!r.ok) return null;
          const conv = await r.json();
          const inbox = conv?.inbox_id ?? conv?.payload?.inbox_id ?? null;
          return canSee(vis, inbox) ? id : null;
        }));
        ids = checked.filter((x): x is number => x != null);
      }
      if (ids.length === 0) return json({ messages: [] });

      // "before" pages back through history — applies to the primary conversation.
      const before = body.before ? `?before=${encodeURIComponent(String(body.before))}` : '';
      if (before) {
        const res = await chatwootFetch(
          cfg, cw.token, `${base}/conversations/${ids[0]}/messages${before}`,
        );
        if (!res.ok) return json({ error: 'Falha ao carregar mensagens' }, 502);
        const data = await res.json();
        return json({ messages: (data?.payload ?? []).map((m: any) => normalizeMessage(m, cfg.chatwootUrl)) });
      }

      // Merge the threads of all conversations of this contact into one.
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await chatwootFetch(cfg, cw.token, `${base}/conversations/${id}/messages`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data?.payload ?? []).map((m: any) => normalizeMessage(m, cfg.chatwootUrl));
        }),
      );
      const merged = results
        .flat()
        .sort((a: any, b: any) => (a.created_at ?? 0) - (b.created_at ?? 0));
      return json({ messages: merged });
    }

    if (action === 'send_message') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      // Block replying on a restricted caixa the viewer can't access.
      if (body.inbox_id != null && !canSee(await getVisibility(), Number(body.inbox_id))) {
        return json({ error: 'Sem acesso a esta caixa' }, 403);
      }
      const attachment = body.attachment as
        | { data: string; mimetype: string; filename: string; kind: string }
        | undefined;
      const text = String(content ?? '').trim();
      if (!text && !attachment) return json({ error: 'Mensagem vazia' }, 400);

      // Send OUTBOUND directly through Evolution (by the contact's phone number),
      // instead of relying on the Chatwoot -> Evolution relay. Imported
      // conversations have a broken contact_inbox.source_id (a random UUID) that
      // does not route back to WhatsApp, so the relay silently drops them. The
      // phone number is always correct, so this delivers for EVERY conversation.
      // Evolution mirrors the sent message back into Chatwoot, so it still shows
      // up in the inbox via the polling refetch.
      // The client passes contact_phone (already in its conversation list) to skip
      // a Chatwoot round trip; fall back to the lookup when absent.
      let number = String(contact_phone ?? '').replace(/\D/g, '');
      if (!number) {
        const convRes = await chatwootFetch(cfg, cw.token, `${base}/conversations/${conversation_id}`);
        if (!convRes.ok) return json({ error: 'Conversa não encontrada' }, 502);
        const conv = await convRes.json();
        const sender = conv?.meta?.sender ?? conv?.payload?.meta?.sender ?? {};
        number = String(sender.phone_number ?? sender.identifier ?? '').replace(/\D/g, '');
      }
      if (!number) return json({ error: 'Contacto sem número de telefone' }, 422);

      // Reply/quote: reference the original WhatsApp message by its id.
      const quoted = body.quoted_id
        ? { key: { id: String(body.quoted_id).replace(/^WAID:/i, '') } }
        : undefined;

      let evoRes: Response;
      if (attachment && attachment.kind === 'voice') {
        // Voice note (recorded in the CRM). encoding:true makes Evolution convert
        // to the WhatsApp ptt format (ogg/opus) server-side.
        evoRes = await evolutionFetch(cfg, `/message/sendWhatsAppAudio/${await getInstance()}`, 'POST', {
          number,
          audio: attachment.data,
          encoding: true,
          ...(quoted ? { quoted } : {}),
        });
      } else if (attachment) {
        const mediatype = MEDIA_TYPES[attachment.kind] ?? 'document';
        evoRes = await evolutionFetch(cfg, `/message/sendMedia/${await getInstance()}`, 'POST', {
          number,
          mediatype,
          mimetype: attachment.mimetype,
          media: attachment.data,
          fileName: attachment.filename,
          ...(text ? { caption: text } : {}),
          ...(quoted ? { quoted } : {}),
        });
      } else {
        evoRes = await evolutionFetch(cfg, `/message/sendText/${await getInstance()}`, 'POST', {
          number,
          text,
          ...(quoted ? { quoted } : {}),
        });
      }
      if (!evoRes.ok) {
        console.error('Evolution send failed:', evoRes.status, await evoRes.text());
        return json({ error: 'Falha ao enviar para o WhatsApp' }, 502);
      }
      return json({ ok: true });
    }

    if (action === 'send_note') {
      // Internal note: agent-only. Posted DIRECTLY to Chatwoot as a private
      // message — it is NOT routed through Evolution, so the customer never sees
      // it on WhatsApp.
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const text = String(content ?? '').trim();
      if (!text) return json({ error: 'Nota vazia' }, 400);
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/messages`, 'POST',
        { content: text, message_type: 'outgoing', private: true },
      );
      if (!res.ok) {
        console.error('Chatwoot note failed:', res.status, await res.text());
        return json({ error: 'Falha ao guardar a nota' }, 502);
      }
      return json({ ok: true });
    }

    if (action === 'start_conversation') {
      // Message a number that has no conversation yet. Evolution mirrors the sent
      // message into Chatwoot, which creates the conversation; the list poll then
      // picks it up.
      const phone = String(body.phone ?? '').replace(/\D/g, '');
      const text = String(content ?? '').trim();
      if (!phone || phone.length < 9) return json({ error: 'Número inválido' }, 400);
      if (!text) return json({ error: 'Mensagem vazia' }, 400);
      const evoRes = await evolutionFetch(cfg, `/message/sendText/${await getInstance()}`, 'POST', {
        number: phone,
        text,
      });
      if (!evoRes.ok) {
        console.error('Evolution start failed:', evoRes.status, await evoRes.text());
        return json({ error: 'Falha ao enviar — confirma que o número tem WhatsApp' }, 502);
      }
      return json({ ok: true });
    }

    if (action === 'toggle_status') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const status = body.status === 'resolved' ? 'resolved' : 'open';
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/toggle_status`, 'POST', { status },
      );
      if (!res.ok) return json({ error: 'Falha ao atualizar a conversa' }, 502);
      return json({ ok: true });
    }

    if (action === 'assign_conversation') {
      // Chatwoot agents don't map to CRM users (each org has a single bot agent),
      // so the assignment lives in conversation custom_attributes instead.
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      // Use "" (not null) to clear — Chatwoot's custom_attributes merge silently
      // drops null values, which would leave the old assignment in place.
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/custom_attributes`, 'POST',
        {
          custom_attributes: {
            senvia_assigned_id: body.user_id ?? '',
            senvia_assigned_name: body.user_name ?? '',
          },
        },
      );
      if (!res.ok) return json({ error: 'Falha ao atribuir a conversa' }, 502);
      return json({ ok: true });
    }

    if (action === 'link_crm') {
      // Manually link the conversation to an existing lead/client (overrides the
      // phone auto-match). Empty kind/id clears the link.
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/custom_attributes`, 'POST',
        {
          custom_attributes: {
            senvia_crm_kind: body.kind ?? '',
            senvia_crm_id: body.id ?? '',
            senvia_crm_name: body.name ?? '',
          },
        },
      );
      if (!res.ok) return json({ error: 'Falha ao associar' }, 502);
      return json({ ok: true });
    }

    if (action === 'rename_contact') {
      const contactId = Number(body.contact_id);
      const name = String(body.name ?? '').trim();
      if (!contactId || !name) return json({ error: 'Dados em falta' }, 400);
      const res = await chatwootFetch(cfg, cw.token, `${base}/contacts/${contactId}`, 'PATCH', { name });
      if (!res.ok) return json({ error: 'Falha ao renomear o contacto' }, 502);
      return json({ ok: true });
    }

    if (action === 'list_labels') {
      const res = await chatwootFetch(cfg, cw.token, `${base}/labels`);
      if (!res.ok) return json({ labels: [] });
      const data = await res.json();
      const payload = data?.payload ?? [];
      return json({ labels: payload.map((l: any) => ({ id: l.id, title: l.title, color: l.color ?? null })) });
    }

    if (action === 'create_label') {
      const title = String(body.title ?? '').trim().toLowerCase().replace(/\s+/g, '-');
      if (!title) return json({ error: 'Título em falta' }, 400);
      const res = await chatwootFetch(cfg, cw.token, `${base}/labels`, 'POST', {
        title,
        color: '#1F93FF',
        show_on_sidebar: true,
      });
      if (!res.ok) return json({ error: 'Falha ao criar etiqueta' }, 502);
      return json({ ok: true });
    }

    if (action === 'set_labels') {
      if (!conversation_id) return json({ error: 'conversation_id em falta' }, 400);
      const labels = Array.isArray(body.labels) ? body.labels.map(String) : [];
      const res = await chatwootFetch(
        cfg, cw.token, `${base}/conversations/${conversation_id}/labels`, 'POST', { labels },
      );
      if (!res.ok) return json({ error: 'Falha ao atualizar etiquetas' }, 502);
      return json({ ok: true });
    }

    if (action === 'delete_label') {
      const labelId = Number(body.label_id);
      if (!labelId) return json({ error: 'label_id em falta' }, 400);
      // Account-level delete: removes the label definition (Chatwoot also strips
      // it from every conversation that had it).
      const res = await chatwootFetch(cfg, cw.token, `${base}/labels/${labelId}`, 'DELETE');
      if (!res.ok) return json({ error: 'Falha ao apagar etiqueta' }, 502);
      return json({ ok: true });
    }

    if (action === 'list_canned') {
      const res = await chatwootFetch(cfg, cw.token, `${base}/canned_responses`);
      if (!res.ok) return json({ canned: [] });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.payload ?? [];
      return json({ canned: list.map((c: any) => ({ id: c.id, content: c.content })) });
    }

    if (action === 'create_canned') {
      const text = String(body.content ?? '').trim();
      if (!text) return json({ error: 'Conteúdo em falta' }, 400);
      // short_code is required by Chatwoot — derive it from the content.
      const shortCode = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/^-|-$/g, '') || `resposta-${Date.now()}`;
      const res = await chatwootFetch(cfg, cw.token, `${base}/canned_responses`, 'POST', {
        short_code: shortCode,
        content: text,
      });
      if (!res.ok) return json({ error: 'Falha ao guardar a resposta rápida' }, 502);
      return json({ ok: true });
    }

    if (action === 'delete_canned') {
      const cannedId = Number(body.canned_id);
      if (!cannedId) return json({ error: 'canned_id em falta' }, 400);
      const res = await chatwootFetch(cfg, cw.token, `${base}/canned_responses/${cannedId}`, 'DELETE');
      if (!res.ok) return json({ error: 'Falha ao apagar a resposta rápida' }, 502);
      return json({ ok: true });
    }

    if (action === 'typing') {
      // Show "typing..." on the contact's WhatsApp while the agent writes.
      const phone = String(body.phone ?? '').replace(/\D/g, '');
      if (!phone) return json({ ok: false });
      // Fire-and-forget; never block the composer on this.
      evolutionFetch(cfg, `/chat/sendPresence/${await getInstance()}`, 'POST', {
        number: phone,
        presence: 'composing',
        delay: 4000,
      }).catch(() => {});
      return json({ ok: true });
    }

    if (action === 'suggest_reply') {
      // AI-drafted reply based on the recent conversation (Gemini — same key
      // the Otto assistant uses).
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey) return json({ error: 'IA não configurada (GEMINI_API_KEY em falta)' }, 500);
      const ids: number[] = Array.isArray(body.conversation_ids) && body.conversation_ids.length > 0
        ? body.conversation_ids.map(Number).filter(Boolean)
        : conversation_id ? [Number(conversation_id)] : [];
      if (ids.length === 0) return json({ error: 'conversation_id em falta' }, 400);

      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await chatwootFetch(cfg, cw.token, `${base}/conversations/${id}/messages`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data?.payload ?? []).map((m: any) => normalizeMessage(m, cfg.chatwootUrl));
        }),
      );
      const history = results
        .flat()
        .filter((m: any) => !m.is_activity && m.content)
        .sort((a: any, b: any) => (a.created_at ?? 0) - (b.created_at ?? 0))
        .slice(-25)
        .map((m: any) => `${m.outgoing ? 'EU' : 'CLIENTE'}: ${m.content}`)
        .join('\n');
      if (!history) return json({ error: 'Sem histórico suficiente' }, 422);

      const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          temperature: 0.4,
          messages: [
            {
              role: 'system',
              content:
                'És um assistente de vendas português (PT-PT). Vais sugerir a PRÓXIMA resposta do comercial ("EU") nesta conversa de WhatsApp com um cliente. Regras: responde APENAS com o texto da mensagem sugerida, sem aspas, sem explicações. Tom profissional mas próximo, adequado a WhatsApp (curto, direto, no máximo 3 frases). Nunca inventes dados, preços ou compromissos que não estejam na conversa.',
            },
            { role: 'user', content: `Conversa:\n${history}\n\nSugere a próxima resposta de EU:` },
          ],
        }),
      });
      if (!aiRes.ok) {
        console.error('suggest_reply AI failed:', aiRes.status, await aiRes.text());
        return json({ error: 'Falha na IA — tenta novamente' }, 502);
      }
      const aiData = await aiRes.json();
      const suggestion = String(aiData?.choices?.[0]?.message?.content ?? '').trim();
      if (!suggestion) return json({ error: 'A IA não devolveu sugestão' }, 502);
      return json({ suggestion });
    }

    if (action === 'delete_message') {
      // Delete-for-everyone on WhatsApp via Evolution. The Chatwoot mirror keeps
      // the original text; the client hides it locally.
      const waId = String(body.wa_id ?? '').replace(/^WAID:/i, '');
      const phone = String(body.phone ?? '').replace(/\D/g, '');
      if (!waId || !phone) return json({ error: 'Dados em falta' }, 400);
      const res = await evolutionFetch(cfg, `/chat/deleteMessageForEveryone/${await getInstance()}`, 'DELETE', {
        id: waId,
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: true,
      });
      if (!res.ok) {
        console.error('Evolution delete failed:', res.status, await res.text());
        return json({ error: 'Falha ao apagar a mensagem no WhatsApp' }, 502);
      }
      return json({ ok: true });
    }

    if (action === 'download_attachment') {
      // Proxy the file through the edge function: the browser cannot fetch
      // Chatwoot attachments directly (no CORS headers on Active Storage).
      const fileUrl = String(body.url ?? '');
      // Only proxy files hosted on OUR Chatwoot — never arbitrary URLs (SSRF).
      if (!fileUrl.startsWith(`${cfg.chatwootUrl}/`)) {
        return json({ error: 'URL inválido' }, 400);
      }
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) return json({ error: 'Falha ao transferir o ficheiro' }, 502);
      return new Response(fileRes.body, {
        headers: { ...corsHeaders, 'Content-Type': 'application/octet-stream' },
      });
    }

    if (action === 'mark_read') {
      const ids: number[] = Array.isArray(body.conversation_ids) && body.conversation_ids.length > 0
        ? body.conversation_ids.map(Number).filter(Boolean)
        : conversation_id ? [Number(conversation_id)] : [];
      if (ids.length === 0) return json({ error: 'conversation_id em falta' }, 400);

      // 1) Mark as read in Chatwoot (clears the CRM unread badge) — all the
      // contact's conversations (primary + merged alts).
      const cwResults = await Promise.all(
        ids.map((id) =>
          chatwootFetch(cfg, cw.token, `${base}/conversations/${id}/update_last_seen`, 'POST'),
        ),
      );

      // 2) WhatsApp read receipts (blue ticks) via Evolution — heavy (several
      // Chatwoot + Evolution round trips), so it runs AFTER the response; the
      // client never waits on it.
      runInBackground((async () => {
        try {
          const convRes = await chatwootFetch(cfg, cw.token, `${base}/conversations/${ids[0]}`);
          if (!convRes.ok) return;
          const conv = await convRes.json();
          const sender = conv?.meta?.sender ?? conv?.payload?.meta?.sender ?? {};
          const rawPhone = String(sender.phone_number ?? sender.identifier ?? '').replace(/\D/g, '');
          if (!rawPhone) return;
          const remoteJid = `${rawPhone}@s.whatsapp.net`;

          // Get incoming message IDs from Chatwoot (source_id = WhatsApp message key).
          const readMessages: { remoteJid: string; fromMe: boolean; id: string }[] = [];
          const seen = new Set<string>();
          const msgsResults = await Promise.all(
            ids.map((id) => chatwootFetch(cfg, cw.token, `${base}/conversations/${id}/messages`)),
          );
          for (const msgsRes of msgsResults) {
            if (!msgsRes.ok) continue;
            const msgsData = await msgsRes.json();
            // Chatwoot stores the WhatsApp message id as "WAID:<id>" — strip the
            // prefix, otherwise WhatsApp silently ignores the receipt (Evolution
            // still answers 201 because it sends it blindly).
            for (const m of msgsData?.payload ?? []) {
              if (m.message_type !== 0 || !m.source_id) continue;
              const id = String(m.source_id).replace(/^WAID:/i, '');
              if (!seen.has(id)) {
                seen.add(id);
                readMessages.push({ remoteJid, fromMe: false, id });
              }
            }
          }

          if (readMessages.length > 0) {
            const evoRes = await evolutionFetch(
              cfg, `/chat/markMessageAsRead/${await getInstance()}`, 'POST', { readMessages },
            );
            if (!evoRes.ok) {
              console.error('Evolution markMessageAsRead failed:', evoRes.status, await evoRes.text());
            }
          }
        } catch (e) {
          console.error('Evolution read receipt failed:', e);
        }
      })());

      return json({ ok: cwResults.every((r) => r.ok) });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (err) {
    console.error('chatwoot-inbox error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
