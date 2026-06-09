import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeam';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

export interface CommissionItem {
  kind: 'direct' | 'recurring';
  id: string;            // saleId (direct) or stripe record id (recurring)
  label: string;         // client / sale label
  date: string | null;
  amount: number;        // commission amount
  saleValue: number | null; // sale total value (direct sales); null for recurring
  paid: boolean;
}

export interface CommercialCommission {
  userId: string;
  name: string;
  items: CommissionItem[];
  total: number;
  totalPending: number;
  totalPaid: number;
  pendingSaleIds: string[];
  pendingRecordIds: string[];
}

export interface CommercialCommissionsData {
  commercials: CommercialCommission[];
  total: number;
  totalPending: number;
}

/**
 * Unified per-commercial commissions for a month: direct-sale commissions
 * (sales.comissao) + recurring Stripe commissions (stripe_commission_records),
 * each carrying a paid/pending flag. Commercial resolved as
 * client.assigned_to → lead.assigned_to → sales.created_by.
 */
export function useCommercialCommissions(selectedMonth: string, effectiveUserIds?: string[] | null) {
  const { organization } = useAuth();
  const { data: members } = useTeamMembers();
  const organizationId = organization?.id;

  return useQuery<CommercialCommissionsData>({
    queryKey: ['commercial-commissions', organizationId, selectedMonth, members?.length],
    queryFn: async () => {
      const empty: CommercialCommissionsData = { commercials: [], total: 0, totalPending: 0 };
      if (!organizationId || !selectedMonth) return empty;

      const monthStart = startOfMonth(new Date(selectedMonth));
      const monthEnd = endOfMonth(monthStart);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // --- Direct commissions (delivered/fulfilled sales with commission) ---
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id, code, comissao, total_value, client_id, lead_id, created_by, sale_date, activation_date, commission_paid_at, payment_status')
        .eq('organization_id', organizationId)
        .in('status', ['delivered', 'fulfilled']);
      if (salesErr) throw salesErr;

      const candidateSales = (sales || []).filter((s: any) => {
        const ref = s.activation_date || s.sale_date;
        if (!ref) return false;
        const d = new Date(ref);
        return d >= monthStart && d <= monthEnd && Number(s.comissao || 0) > 0;
      });

      // A commission is only payable when the sale is RECEIVED (concluded AND
      // fully paid by the client). Sum the paid parcels per candidate sale and
      // keep only the received ones — unreceived sales are not yet payable.
      const candIds = candidateSales.map((s: any) => s.id);
      const { data: candPays } = candIds.length
        ? await supabase.from('sale_payments').select('sale_id, amount, status').in('sale_id', candIds)
        : { data: [] as any[] };
      const candPaidSum = new Map<string, number>();
      for (const p of (candPays as any[]) || []) {
        if (p.status === 'paid') candPaidSum.set(p.sale_id, (candPaidSum.get(p.sale_id) || 0) + Number(p.amount || 0));
      }
      const isReceived = (s: any) =>
        (Number(s.total_value) > 0 && (candPaidSum.get(s.id) || 0) >= Number(s.total_value) - 0.01) ||
        s.payment_status === 'paid';

      const inMonth = candidateSales.filter(isReceived);

      const clientIds = [...new Set(inMonth.map((s: any) => s.client_id).filter(Boolean))] as string[];
      const leadIds = [...new Set(inMonth.map((s: any) => s.lead_id).filter(Boolean))] as string[];
      const [clientsRes, leadsRes] = await Promise.all([
        clientIds.length
          ? supabase.from('crm_clients').select('id, name, company, assigned_to').in('id', clientIds)
          : Promise.resolve({ data: [] as any[] }),
        leadIds.length
          ? supabase.from('leads').select('id, name, assigned_to').in('id', leadIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const clientMap = new Map<string, any>((clientsRes.data || []).map((c: any) => [c.id, c]));
      const leadMap = new Map<string, any>((leadsRes.data || []).map((l: any) => [l.id, l]));

      const getCommercial = (s: any): string => {
        if (s.client_id && clientMap.get(s.client_id)?.assigned_to) return clientMap.get(s.client_id).assigned_to;
        if (s.lead_id && leadMap.get(s.lead_id)?.assigned_to) return leadMap.get(s.lead_id).assigned_to;
        return (s.created_by as string) || 'unassigned';
      };
      const getClientName = (s: any): string => {
        if (s.client_id) { const c = clientMap.get(s.client_id); if (c) return c.name || c.company || 'Cliente'; }
        if (s.lead_id) { const l = leadMap.get(s.lead_id); if (l) return l.name || 'Lead'; }
        return (s.code as string) || 'Venda';
      };

      // --- Recurring commissions (Stripe) — both pending and paid in month ---
      const { data: records, error: recErr } = await (supabase as any)
        .from('stripe_commission_records')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', `${monthStartStr}T00:00:00`)
        .lte('created_at', `${monthEndStr}T23:59:59`);
      if (recErr) throw recErr;
      const recs = (records || []) as any[];
      const recOrgIds = [...new Set(recs.map(r => r.client_org_id).filter(Boolean))] as string[];
      const orgsRes = recOrgIds.length
        ? await supabase.from('organizations').select('id, name').in('id', recOrgIds)
        : { data: [] as any[] };
      const orgMap = new Map((orgsRes.data || []).map((o: any) => [o.id, o.name]));

      // Friendly label for recurring records via their linked sale's client
      // (manual renewals have no tenant org, so the org name would be wrong).
      const recSaleIds = [...new Set(recs.map(r => r.sale_id).filter(Boolean))] as string[];
      const recSalesRes = recSaleIds.length
        ? await supabase.from('sales').select('id, client_id, lead_id, code').in('id', recSaleIds)
        : { data: [] as any[] };
      const recSales = (recSalesRes.data as any[]) || [];
      const recCIds = [...new Set(recSales.map(s => s.client_id).filter(Boolean))] as string[];
      const recLIds = [...new Set(recSales.map(s => s.lead_id).filter(Boolean))] as string[];
      const [recCRes, recLRes] = await Promise.all([
        recCIds.length ? supabase.from('crm_clients').select('id, name, company').in('id', recCIds) : Promise.resolve({ data: [] as any[] }),
        recLIds.length ? supabase.from('leads').select('id, name').in('id', recLIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const recCMap = new Map((recCRes.data || []).map((c: any) => [c.id, c.name || c.company]));
      const recLMap = new Map((recLRes.data || []).map((l: any) => [l.id, l.name]));
      const recSaleLabel = new Map<string, string>(
        recSales.map((s: any) => [s.id, recCMap.get(s.client_id) || recLMap.get(s.lead_id) || s.code || 'Subscrição']),
      );

      const memberName = (userId: string) => {
        if (userId === 'unassigned') return 'Sem Comercial';
        const m = members?.find((m: any) => m.user_id === userId);
        return m?.full_name || 'Desconhecido';
      };

      const byUser = new Map<string, CommercialCommission>();
      const ensure = (userId: string): CommercialCommission => {
        let e = byUser.get(userId);
        if (!e) {
          e = { userId, name: memberName(userId), items: [], total: 0, totalPending: 0, totalPaid: 0, pendingSaleIds: [], pendingRecordIds: [] };
          byUser.set(userId, e);
        }
        return e;
      };

      for (const s of inMonth) {
        const e = ensure(getCommercial(s));
        const amount = Number(s.comissao || 0);
        const paid = !!s.commission_paid_at;
        e.items.push({ kind: 'direct', id: s.id, label: getClientName(s), date: s.activation_date || s.sale_date || null, amount, saleValue: Number(s.total_value || 0), paid });
        e.total += amount;
        if (paid) e.totalPaid += amount; else { e.totalPending += amount; e.pendingSaleIds.push(s.id); }
      }
      for (const r of recs) {
        const e = ensure((r.user_id as string) || 'unassigned');
        const amount = Number(r.commission_amount || 0);
        const paid = r.status === 'paid';
        e.items.push({ kind: 'recurring', id: r.id, label: recSaleLabel.get(r.sale_id) || orgMap.get(r.client_org_id) || 'Subscrição', date: r.created_at, amount, saleValue: Number(r.amount || 0), paid });
        e.total += amount;
        if (paid) e.totalPaid += amount; else { e.totalPending += amount; e.pendingRecordIds.push(r.id); }
      }

      let commercials = Array.from(byUser.values());
      if (effectiveUserIds && effectiveUserIds.length > 0) {
        commercials = commercials.filter(c => effectiveUserIds.includes(c.userId));
      }
      commercials.forEach(c => c.items.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      commercials.sort((a, b) => b.totalPending - a.totalPending || b.total - a.total);

      const total = commercials.reduce((s, c) => s + c.total, 0);
      const totalPending = commercials.reduce((s, c) => s + c.totalPending, 0);
      return { commercials, total, totalPending };
    },
    enabled: !!organizationId && !!selectedMonth,
  });
}

/**
 * Org-wide commission total for a date range (for the Resumo "Comissões" card):
 * direct-sale commissions (delivered/fulfilled, by activation/sale date) +
 * pending recurring commissions (by created_at). When no range is given,
 * returns the all-time total.
 */
export function useTeamCommissionTotal(dateRange?: DateRange) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const fromKey = dateRange?.from ? dateRange.from.toISOString() : 'all';
  const toKey = dateRange?.to ? dateRange.to.toISOString() : 'none';

  return useQuery<{ total: number; count: number }>({
    queryKey: ['team-commission-total', orgId, fromKey, toKey],
    queryFn: async () => {
      if (!orgId) return { total: 0, count: 0 };

      const inRange = (dateStr?: string | null) => {
        if (!dateRange?.from) return true;
        if (!dateStr) return false;
        const d = parseISO(dateStr);
        if (d < startOfDay(dateRange.from)) return false;
        if (dateRange.to && d > endOfDay(dateRange.to)) return false;
        return true;
      };

      const { data: sales } = await supabase
        .from('sales')
        .select('id, comissao, total_value, sale_date, activation_date, payment_status')
        .eq('organization_id', orgId)
        .in('status', ['delivered', 'fulfilled']);

      // Only count commissions on RECEIVED sales (concluded AND fully paid).
      const candidates = ((sales || []) as any[]).filter(
        (s) => Number(s.comissao || 0) > 0 && inRange(s.activation_date || s.sale_date),
      );
      const candIds = candidates.map((s) => s.id);
      const { data: candPays } = candIds.length
        ? await supabase.from('sale_payments').select('sale_id, amount, status').in('sale_id', candIds)
        : { data: [] as any[] };
      const paidSum = new Map<string, number>();
      for (const p of (candPays as any[]) || []) {
        if (p.status === 'paid') paidSum.set(p.sale_id, (paidSum.get(p.sale_id) || 0) + Number(p.amount || 0));
      }

      let total = 0;
      let count = 0;
      for (const s of candidates) {
        const received =
          (Number(s.total_value) > 0 && (paidSum.get(s.id) || 0) >= Number(s.total_value) - 0.01) ||
          s.payment_status === 'paid';
        if (received) { total += Number(s.comissao || 0); count += 1; }
      }

      const { data: recs } = await (supabase as any)
        .from('stripe_commission_records')
        .select('commission_amount, created_at, status')
        .eq('organization_id', orgId)
        .eq('status', 'pending');
      for (const r of (recs || []) as any[]) {
        if (inRange(r.created_at)) total += Number(r.commission_amount || 0);
      }

      return { total, count };
    },
    enabled: !!orgId,
  });
}

export function usePayCommercialCommissions() {
  const queryClient = useQueryClient();
  const { organization, session } = useAuth();

  return useMutation({
    mutationFn: async ({ fullName, bankAccountId, saleIds, recordIds, total }: {
      fullName: string;
      bankAccountId: string | null;
      saleIds: string[];
      recordIds: string[];
      total: number;
    }) => {
      const orgId = organization?.id;
      if (!orgId) throw new Error('No organization');
      const nowIso = new Date().toISOString();

      if (saleIds.length) {
        const { error } = await (supabase as any).from('sales')
          .update({ commission_paid_at: nowIso, commission_bank_account_id: bankAccountId })
          .in('id', saleIds);
        if (error) throw error;
      }
      if (recordIds.length) {
        const { error } = await (supabase as any).from('stripe_commission_records')
          .update({ status: 'paid', paid_at: nowIso, bank_account_id: bankAccountId })
          .in('id', recordIds);
        if (error) throw error;
      }
      if (total > 0) {
        // Use a "Comissões" expense category if one exists (best-effort).
        const { data: cat } = await (supabase as any).from('expense_categories')
          .select('id').eq('organization_id', orgId).ilike('name', 'comiss%').limit(1).maybeSingle();
        const { error: expErr } = await (supabase as any).from('expenses').insert({
          organization_id: orgId,
          category_id: cat?.id ?? null,
          description: `Comissão paga — ${fullName}`,
          amount: total,
          expense_date: nowIso.split('T')[0],
          is_recurring: false,
          notes: `Comissão paga a ${fullName}`,
          created_by: session?.user?.id || null,
          bank_account_id: bankAccountId,
        });
        if (expErr) throw expErr;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['commercial-commissions'] }),
        queryClient.invalidateQueries({ queryKey: ['stripe-commissions'] }),
        queryClient.invalidateQueries({ queryKey: ['team-commissions'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-stats'] }),
      ]);
      toast.success('Comissões marcadas como pagas e registadas como despesa!');
    },
    onError: () => toast.error('Erro ao pagar comissões'),
  });
}
