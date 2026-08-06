import { supabase } from './supabase';
import { phoneKey } from '../lib/protocol';

// Every query here mirrors the matching hook in the CRM so the panel resolves a
// contact to exactly the same record the Senvia inbox would.
// All of it is plain PostgREST under the user's own JWT — RLS does the tenant
// isolation, the extension gets no privileged access whatsoever.

const db = supabase as unknown as {
  from: (t: string) => any;
};

export interface CrmMatch {
  kind: 'lead' | 'client';
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  value: number | null;
  /** How we got here — name matches are a fallback and worth surfacing. */
  matchedBy: 'phone' | 'name';
}

export interface ContactNote {
  id: string;
  content: string;
  author_name: string | null;
  source: string;
  created_at: string;
}

export interface InboxTask {
  id: string;
  title: string;
  due_at: string | null;
  done_at: string | null;
  suggested: boolean;
  created_at: string;
}

export interface DealRow {
  id: string;
  code: string | null;
  status: string | null;
  total_value: number | null;
  created_at: string | null;
}

export const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface ConvRow {
  id: number;
  altIds: number[];
  name: string;
  phone: string;
  status: string | null;
  assignedId: string | null;
  assignedName: string | null;
  labels: string[];
}

// Conversation list from the org's own Chatwoot, cached briefly. One call
// serves every chat the agent clicks through.
let convCache: { at: number; rows: ConvRow[] } | null = null;
const CONV_TTL_MS = 120_000;

/**
 * Resolves a chat name to a phone number using SENVIA's own conversation list.
 *
 * This is the authoritative source and should be tried before anything else:
 * the Senvia inbox never guesses a number because Chatwoot hands it over with
 * every conversation. The extension is looking at the same WhatsApp account, so
 * the same list answers "what number is this chat?" — no DOM scraping, no
 * IndexedDB spelunking, no dependency on the contact existing in the CRM.
 *
 * Only used when the DOM didn't already give us a number.
 */
/** In-flight guard, so a burst of chat clicks shares one request. */
let convInFlight: Promise<void> | null = null;

async function loadConversations(orgId: string): Promise<void> {
  const now = Date.now();
  if (convCache && now - convCache.at <= CONV_TTL_MS) return;
  if (convInFlight) return convInFlight;

  convInFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
        body: { action: 'list_conversations', organization_id: orgId },
      });
      if (error) return;
      const rows: ConvRow[] = (((data as any)?.conversations ?? []) as any[])
        .map((c) => ({
          id: Number(c?.id),
          altIds: Array.isArray(c?.alt_ids) ? c.alt_ids.map(Number) : [],
          name: String(c?.contact_name ?? ''),
          phone: String(c?.contact_phone ?? '').replace(/\D/g, ''),
          status: c?.status ?? null,
          assignedId: c?.assigned_id ?? null,
          assignedName: c?.assigned_name ?? null,
          labels: Array.isArray(c?.labels) ? c.labels.map(String) : [],
        }))
        .filter((r) => Number.isFinite(r.id) && r.phone.length >= 9 && r.name);
      convCache = { at: Date.now(), rows };
    } finally {
      convInFlight = null;
    }
  })();

  return convInFlight;
}

/**
 * Warms the conversation list at boot so the first chat the agent opens is as
 * fast as the rest — the Chatwoot round trip is the slowest part of a cold
 * lookup, and it costs nothing to have it already done.
 */
export function prefetchConversations(orgId: string): void {
  void loadConversations(orgId);
}

export async function resolvePhoneFromSenvia(orgId: string, name: string | null): Promise<string> {
  const label = (name ?? '').trim();
  if (!label) return '';

  await loadConversations(orgId);
  if (!convCache) return '';

  const target = norm(label);
  const exact = convCache.rows.filter((r) => norm(r.name) === target);
  if (exact.length === 1) return exact[0].phone;

  // Same number reachable under slightly different labels counts as one hit.
  const unique = new Set(exact.map((r) => r.phone));
  if (unique.size === 1) return exact[0].phone;
  return '';
}

/**
 * The Chatwoot conversation behind a chat — the handle everything
 * conversation-scoped needs (assign, labels, archive). Matched by phone, which
 * is the one identifier shared by WhatsApp, Chatwoot and the CRM.
 */
export async function findConversation(orgId: string, phone: string): Promise<ConvRow | null> {
  const key = phoneKey(phone);
  if (key.length < 9) return null;
  await loadConversations(orgId);
  return convCache?.rows.find((r) => r.phone.endsWith(key)) ?? null;
}

/** Any conversation-scoped write invalidates the cached list. */
function dropConvCache() {
  convCache = null;
}

async function inbox<T>(orgId: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
    body: { ...body, organization_id: orgId },
  });
  if (error) throw error;
  return data as T;
}

export async function assignConversation(
  orgId: string,
  conversationId: number,
  userId: string | null,
  userName: string | null,
) {
  await inbox(orgId, { action: 'assign_conversation', conversation_id: conversationId, user_id: userId, user_name: userName });
  dropConvCache();
}

export async function toggleConversationStatus(orgId: string, conversationId: number, status: 'open' | 'resolved') {
  await inbox(orgId, { action: 'toggle_status', conversation_id: conversationId, status });
  dropConvCache();
}

export async function listLabels(orgId: string): Promise<{ id: number; title: string; color: string | null }[]> {
  const res = await inbox<{ labels?: any[] }>(orgId, { action: 'list_labels' });
  return (res?.labels ?? []).map((l) => ({ id: Number(l.id), title: String(l.title), color: l.color ?? null }));
}

export async function setConversationLabels(orgId: string, conversationId: number, labels: string[]) {
  await inbox(orgId, { action: 'set_labels', conversation_id: conversationId, labels });
  dropConvCache();
}

export interface TeamMember {
  user_id: string;
  full_name: string;
}

export async function listTeam(orgId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.functions.invoke('get-team-members', {
    body: { organization_id: orgId },
  });
  if (error) return [];
  return (((data ?? []) as any[]) || [])
    .filter((m) => m?.user_id && !m?.is_banned)
    .map((m) => ({ user_id: String(m.user_id), full_name: String(m.full_name ?? m.email ?? '—') }));
}

const asClient = (c: any, matchedBy: 'phone' | 'name'): CrmMatch => ({
  kind: 'client', id: c.id, name: c.name, email: c.email ?? null,
  phone: c.phone ?? null, status: null, value: null, matchedBy,
});

const asLead = (l: any, matchedBy: 'phone' | 'name'): CrmMatch => ({
  kind: 'lead', id: l.id, name: l.name, email: l.email ?? null,
  phone: l.phone ?? null, status: l.status ?? null, value: l.value ?? null, matchedBy,
});

const CLIENT_COLS = 'id, name, email, phone';
const LEAD_COLS = 'id, name, email, phone, status, value';

/**
 * Finds the lead/client behind a conversation. A converted client outranks the
 * original lead, matching `useContactMatch` in the CRM.
 *
 * Primary key is the phone's last 9 digits. When WhatsApp gives us no number —
 * saved contacts show their name in the header, not their number — we fall back
 * to matching on the contact name, but ONLY when it's unambiguous. Attaching
 * notes to the wrong person because two clients share a name would be worse
 * than showing nothing.
 */
export async function findCrmMatch(
  orgId: string,
  phone: string,
  name?: string | null,
): Promise<CrmMatch | null> {
  const suffix = phoneKey(phone);

  if (suffix.length >= 9) {
    // NOTE: in PostgREST's .or() string syntax the LIKE wildcard is '*', not '%'.
    const filter = `phone.like.*${suffix}`;
    const [clients, leads] = await Promise.all([
      db.from('crm_clients').select(CLIENT_COLS).eq('organization_id', orgId).or(filter).limit(1),
      db.from('leads').select(LEAD_COLS).eq('organization_id', orgId).or(filter).limit(1),
    ]);
    if (clients?.data?.[0]) return asClient(clients.data[0], 'phone');
    if (leads?.data?.[0]) return asLead(leads.data[0], 'phone');
    return null;
  }

  const label = (name ?? '').trim();
  if (label.length < 3 || label.startsWith('+')) return null;

  // Accent- and case-insensitive comparison. Postgres can't normalise for us
  // without unaccent(), so we cast a wide net on the longest word and then
  // compare properly here: "João Basílio" in the CRM must match "Joao Basilio"
  // as WhatsApp renders it.
  const target = norm(label);
  const anchor = label
    .split(/\s+/)
    .sort((a, b) => b.length - a.length)[0]
    ?.replace(/[%_*,()]/g, '');
  if (!anchor || anchor.length < 3) return null;

  const [clients, leads] = await Promise.all([
    db.from('crm_clients').select(CLIENT_COLS).eq('organization_id', orgId).ilike('name', `*${anchor}*`).limit(25),
    db.from('leads').select(LEAD_COLS).eq('organization_id', orgId).ilike('name', `*${anchor}*`).limit(25),
  ]);

  const exact = (rows: any[]) => rows.filter((r) => norm(String(r.name ?? '')) === target);
  const cs = exact(clients?.data ?? []);
  const ls = exact(leads?.data ?? []);

  // Exactly one hit, or we don't guess — filing notes against the wrong person
  // is worse than showing nothing.
  if (cs.length === 1) return asClient(cs[0], 'name');
  if (cs.length === 0 && ls.length === 1) return asLead(ls[0], 'name');
  return null;
}

export async function fetchNotes(orgId: string, phone: string): Promise<ContactNote[]> {
  const key = phoneKey(phone);
  if (key.length < 6) return [];
  const { data, error } = await db
    .from('contact_notes')
    .select('id, content, author_name, source, created_at')
    .eq('organization_id', orgId)
    .eq('phone_key', key)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ContactNote[];
}

export async function addNote(orgId: string, phone: string, content: string, authorName: string | null) {
  const digits = String(phone).replace(/\D/g, '');
  const key = digits.slice(-9);
  if (key.length < 6) throw new Error('Contacto sem número válido');
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await db.from('contact_notes').insert({
    organization_id: orgId,
    phone: digits,
    phone_key: key,
    content: content.trim(),
    created_by: auth.user?.id ?? null,
    author_name: authorName,
    // Written from the WhatsApp Web panel — tagged as inbox, same as the CRM's
    // own conversation panel, so the timeline reads consistently.
    source: 'inbox',
  });
  if (error) throw error;
}

export async function fetchTasks(orgId: string, phone: string): Promise<InboxTask[]> {
  const key = phoneKey(phone);
  if (key.length < 9) return [];
  const { data, error } = await db
    .from('inbox_tasks')
    .select('id, title, due_at, done_at, suggested, created_at')
    .eq('organization_id', orgId)
    .eq('phone_key', key)
    .order('done_at', { ascending: true, nullsFirst: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(30);
  if (error) return []; // degrade quietly, exactly like useConversationTasks
  return (data ?? []) as InboxTask[];
}

export async function addTask(
  orgId: string,
  phone: string,
  title: string,
  contactName: string | null,
  match: CrmMatch | null,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) throw new Error('Sessão expirada');
  const { error } = await db.from('inbox_tasks').insert({
    organization_id: orgId,
    created_by: auth.user.id,
    contact_phone: String(phone).replace(/\D/g, '') || null,
    contact_name: contactName,
    lead_id: match?.kind === 'lead' ? match.id : null,
    client_id: match?.kind === 'client' ? match.id : null,
    title: title.trim(),
  });
  if (error) throw error;
}

/**
 * Accepts an AI suggestion, turning it into a real task assigned to whoever
 * accepted it. Mirrors `useAcceptSuggestedTask` in the CRM — a row with
 * `suggested: true` is a proposal awaiting a decision, never a commitment.
 */
export async function acceptTask(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await db
    .from('inbox_tasks')
    .update({ suggested: false, assigned_to: auth.user?.id ?? null })
    .eq('id', id);
  if (error) throw error;
}

/** Ignoring a suggestion deletes it outright, same as the CRM does. */
export async function deleteTask(id: string) {
  const { error } = await db.from('inbox_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleTask(id: string, done: boolean) {
  const { error } = await db
    .from('inbox_tasks')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchDeals(clientId: string): Promise<{ proposals: DealRow[]; sales: DealRow[] }> {
  const [proposals, sales] = await Promise.all([
    db.from('proposals').select('id, code, status, total_value, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
    db.from('sales').select('id, code, status, total_value, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
  ]);
  return {
    proposals: (proposals?.data ?? []) as DealRow[],
    sales: (sales?.data ?? []) as DealRow[],
  };
}

/** Same insert shape as `useCreateLeadFromContact` in the CRM — keep in sync. */
export async function createLead(orgId: string, name: string, phone: string) {
  const { data, error } = await db
    .from('leads')
    .insert({
      organization_id: orgId,
      name: name.trim(),
      phone: String(phone).replace(/\D/g, ''),
      email: '',
      source: 'whatsapp',
      status: 'new',
      gdpr_consent: true,
    })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data?.id as string | undefined;
}
