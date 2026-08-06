import { supabase } from '../panel/supabase';

// Data layer for the in-extension CRM screens.
//
// These talk straight to PostgREST with the agent's own JWT, exactly like the
// real CRM does — RLS provides the tenant isolation, so there is no privileged
// access here and nothing to keep in sync with a server. Column selections
// mirror the CRM's own hooks (useLeads, useClients, useSales, useProposals) so
// a row means the same thing in both places.

const db = supabase as unknown as { from: (t: string) => any };

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string | null;
  value: number | null;
  source: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nif: string | null;
  created_at: string;
}

export interface DealListRow {
  id: string;
  code: string | null;
  status: string | null;
  total_value: number | null;
  created_at: string | null;
  client_id: string | null;
}

const PAGE = 100;

/** Active leads, newest first — `archived_at IS NULL` matches useLeads. */
export async function listLeads(orgId: string, search = ''): Promise<LeadRow[]> {
  let q = db
    .from('leads')
    .select('id, name, phone, email, status, value, source, assigned_to, created_at')
    .eq('organization_id', orgId)
    .is('archived_at', null);

  if (search.trim()) {
    const s = search.trim().replace(/[%,()]/g, '');
    q = q.or(`name.ilike.*${s}*,phone.ilike.*${s}*,email.ilike.*${s}*`);
  }
  const { data, error } = await q.order('created_at', { ascending: false }).limit(PAGE);
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function listClients(orgId: string, search = ''): Promise<ClientRow[]> {
  let q = db
    .from('crm_clients')
    .select('id, name, phone, email, nif, created_at')
    .eq('organization_id', orgId);

  if (search.trim()) {
    const s = search.trim().replace(/[%,()]/g, '');
    q = q.or(`name.ilike.*${s}*,phone.ilike.*${s}*,email.ilike.*${s}*`);
  }
  const { data, error } = await q.order('created_at', { ascending: false }).limit(PAGE);
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

/** Shared shape for sales and proposals — both are code/status/total_value rows. */
async function listDeals(table: 'sales' | 'proposals', orgId: string): Promise<DealListRow[]> {
  const { data, error } = await db
    .from(table)
    .select('id, code, status, total_value, created_at, client_id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  return (data ?? []) as DealListRow[];
}

export const listSales = (orgId: string) => listDeals('sales', orgId);
export const listProposals = (orgId: string) => listDeals('proposals', orgId);

// --- Agenda -----------------------------------------------------------------

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean | null;
  status: string | null;
}

/**
 * Upcoming events. Unlike the CRM's calendar view, which loads everything to
 * render a month grid, this is an agenda list — so it only asks for what's
 * ahead, starting from today.
 */
export async function listEvents(orgId: string): Promise<EventRow[]> {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const { data, error } = await db
    .from('calendar_events')
    .select('id, title, description, event_type, start_time, end_time, all_day, status')
    .eq('organization_id', orgId)
    .gte('start_time', from.toISOString())
    .order('start_time', { ascending: true })
    .limit(PAGE);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

// --- Financeiro ---------------------------------------------------------------

export interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean | null;
}

export interface FinanceSummary {
  expenses: ExpenseRow[];
  expensesTotal: number;
  salesTotal: number;
}

/**
 * Expenses plus the two totals that make them mean something. Deliberately a
 * summary rather than a copy of the CRM's finance module — invoices, receipts
 * and commissions all need their own screens and are better opened there.
 */
export async function fetchFinance(orgId: string): Promise<FinanceSummary> {
  const [expenseRows, salesRows] = await Promise.all([
    db
      .from('expenses')
      .select('id, description, amount, expense_date, is_recurring')
      .eq('organization_id', orgId)
      .order('expense_date', { ascending: false })
      .limit(PAGE),
    db.from('sales').select('total_value').eq('organization_id', orgId).limit(500),
  ]);

  const expenses = (expenseRows?.data ?? []) as ExpenseRow[];
  return {
    expenses,
    expensesTotal: expenses.reduce((s, e) => s + (e.amount ?? 0), 0),
    salesTotal: ((salesRows?.data ?? []) as { total_value: number | null }[]).reduce(
      (s, r) => s + (r.total_value ?? 0),
      0,
    ),
  };
}

// --- Caixa de Entrada (email) -------------------------------------------------

export interface EmailChannelRow {
  id: string;
  name: string | null;
}

export interface EmailFolderRow {
  id: string;
  name: string;
  role: string | null;
  unread_count: number | null;
  sort: number | null;
}

export interface EmailMessageRow {
  id: string;
  from_name: string | null;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  date: string | null;
  seen: boolean | null;
  has_attachments: boolean | null;
}

/** Email inboxes are messaging_channels rows with channel_type = 'email'. */
export async function listEmailChannels(orgId: string): Promise<EmailChannelRow[]> {
  const { data, error } = await db
    .from('messaging_channels')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('channel_type', 'email')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmailChannelRow[];
}

export async function listEmailFolders(channelId: string): Promise<EmailFolderRow[]> {
  const { data, error } = await db
    .from('email_folders')
    .select('id, name, role, unread_count, sort')
    .eq('channel_id', channelId)
    .order('sort', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmailFolderRow[];
}

export async function listEmailMessages(folderId: string): Promise<EmailMessageRow[]> {
  const { data, error } = await db
    .from('email_messages')
    .select('id, from_name, from_address, subject, snippet, date, seen, has_attachments')
    .eq('folder_id', folderId)
    .order('date', { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  return (data ?? []) as EmailMessageRow[];
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailFull {
  id: string;
  channel_id: string;
  message_id: string | null;
  from_name: string | null;
  from_address: string | null;
  to_addresses: EmailAddress[] | null;
  cc_addresses: EmailAddress[] | null;
  subject: string | null;
  snippet: string | null;
  date: string | null;
  seen: boolean | null;
  body_fetched: boolean | null;
  html_body: string | null;
  text_body: string | null;
  email_references: string[] | null;
}

export async function fetchEmailMessage(id: string): Promise<EmailFull | null> {
  const { data, error } = await db.from('email_messages').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as EmailFull | null;
}

/**
 * Every mailbox action is queued for the IMAP gateway rather than performed
 * here — the extension has no IMAP connection, and neither does the CRM. The
 * gateway drains `email_commands` and applies them against the real mailbox.
 * Accepted types are defined in email-gateway/src/commands.js.
 */
async function queueEmailCommand(
  orgId: string,
  channelId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from('email_commands')
    .insert({ organization_id: orgId, channel_id: channelId, type, payload });
  if (error) throw error;
}

export function markEmailRead(orgId: string, channelId: string, messageId: string) {
  return queueEmailCommand(orgId, channelId, 'mark_read', { messageId });
}

export interface SendEmailInput {
  to: EmailAddress[];
  subject: string;
  html: string;
  inReplyTo?: string | null;
  references?: string[];
}

export function sendEmail(orgId: string, channelId: string, payload: SendEmailInput) {
  return queueEmailCommand(orgId, channelId, 'send', payload as unknown as Record<string, unknown>);
}

/** `Re:` once, never `Re: Re: Re:`. */
export function replySubject(subject: string | null): string {
  const s = (subject ?? '').trim();
  if (!s) return 'Re:';
  return /^re\s*:/i.test(s) ? s : `Re: ${s}`;
}

/**
 * Threading headers for a reply. Mail clients use References to build the
 * thread, so the original's chain has to be carried forward with its own id
 * appended — dropping it makes the reply start a new thread in the recipient's
 * client.
 */
export function replyReferences(original: EmailFull): string[] {
  const prior = original.email_references ?? [];
  return original.message_id ? [...prior, original.message_id] : prior;
}

export interface Totals {
  leads: number;
  clients: number;
  openProposals: number;
  salesValue: number;
}

/**
 * Counts for the overview. Uses head+exact so the rows never travel — only the
 * count comes back.
 */
export async function fetchTotals(orgId: string): Promise<Totals> {
  const countOf = async (table: string, extra?: (q: any) => any) => {
    let q = db.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
    if (extra) q = extra(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [leads, clients, openProposals, salesRows] = await Promise.all([
    countOf('leads', (q) => q.is('archived_at', null)),
    countOf('crm_clients'),
    countOf('proposals', (q) => q.neq('status', 'rejected')),
    db.from('sales').select('total_value').eq('organization_id', orgId).limit(500),
  ]);

  const salesValue = ((salesRows?.data ?? []) as { total_value: number | null }[]).reduce(
    (sum, r) => sum + (r.total_value ?? 0),
    0,
  );

  return { leads, clients, openProposals, salesValue };
}
