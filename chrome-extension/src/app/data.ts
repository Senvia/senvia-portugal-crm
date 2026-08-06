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
