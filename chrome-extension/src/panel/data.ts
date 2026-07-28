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

/**
 * Finds the lead/client behind a phone number — last 9 digits, the same key
 * `useContactMatch` uses. A converted client outranks the original lead.
 */
export async function findCrmMatch(orgId: string, phone: string): Promise<CrmMatch | null> {
  const suffix = phoneKey(phone);
  if (suffix.length < 9) return null;
  // NOTE: in PostgREST's .or() string syntax the LIKE wildcard is '*', not '%'.
  const filter = `phone.like.*${suffix}`;

  const [clients, leads] = await Promise.all([
    db.from('crm_clients').select('id, name, email, phone').eq('organization_id', orgId).or(filter).limit(1),
    db.from('leads').select('id, name, email, phone, status, value').eq('organization_id', orgId).or(filter).limit(1),
  ]);

  const client = clients?.data?.[0];
  if (client) {
    return { kind: 'client', id: client.id, name: client.name, email: client.email ?? null, phone: client.phone ?? null, status: null, value: null };
  }
  const lead = leads?.data?.[0];
  if (lead) {
    return { kind: 'lead', id: lead.id, name: lead.name, email: lead.email ?? null, phone: lead.phone ?? null, status: lead.status ?? null, value: lead.value ?? null };
  }
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
