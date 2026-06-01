import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PendingApprovalSale {
  id: string;
  code: string | null;
  total_value: number;
  comissao: number | null;
  status: string;
  sale_date: string | null;
  activation_date: string | null;
  created_at: string;
  client_id: string | null;
  lead_id: string | null;
  notes: string | null;
  client_name: string | null;
  commercial_id: string | null;
  commercial_name: string | null;
}

/**
 * Sales waiting for admin approval (status pending / in_progress).
 * Resolves the "commercial" via the linked client.assigned_to (or lead.assigned_to)
 * and their profile name, the way useLiveCommissions does it.
 */
export function usePendingApprovalSales() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['sales-pending-approval', organizationId],
    queryFn: async (): Promise<PendingApprovalSale[]> => {
      if (!organizationId) return [];

      const { data: sales, error } = await supabase
        .from('sales')
        .select('id, code, total_value, comissao, status, sale_date, activation_date, created_at, client_id, lead_id, notes')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!sales || sales.length === 0) return [];

      const clientIds = [...new Set(sales.map(s => s.client_id).filter(Boolean))] as string[];
      const leadIds = [...new Set(sales.map(s => s.lead_id).filter(Boolean))] as string[];

      const [clientsRes, leadsRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('crm_clients').select('id, name, company, assigned_to').in('id', clientIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        leadIds.length > 0
          ? supabase.from('leads').select('id, name, assigned_to').in('id', leadIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
      const leadMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l]));

      const userIds = new Set<string>();
      for (const s of sales) {
        const c = s.client_id ? clientMap.get(s.client_id) : null;
        const l = s.lead_id ? leadMap.get(s.lead_id) : null;
        const uid = (c?.assigned_to as string | null) || (l?.assigned_to as string | null);
        if (uid) userIds.add(uid);
      }

      const profileMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        for (const p of profiles || []) {
          profileMap.set(p.id as string, (p.full_name as string) || '');
        }
      }

      return sales.map(s => {
        const c = s.client_id ? clientMap.get(s.client_id) : null;
        const l = s.lead_id ? leadMap.get(s.lead_id) : null;
        const commercialId = (c?.assigned_to as string | null) || (l?.assigned_to as string | null) || null;
        return {
          id: s.id,
          code: s.code,
          total_value: s.total_value,
          comissao: s.comissao,
          status: s.status,
          sale_date: s.sale_date,
          activation_date: s.activation_date,
          created_at: s.created_at,
          client_id: s.client_id,
          lead_id: s.lead_id,
          notes: s.notes,
          client_name: (c?.name as string) || (c?.company as string) || (l?.name as string) || null,
          commercial_id: commercialId,
          commercial_name: commercialId ? (profileMap.get(commercialId) || null) : null,
        };
      });
    },
    enabled: !!organizationId,
  });
}

/**
 * Approve a sale: mark it delivered and record who/when. Triggers the
 * existing commission pipeline (useLiveCommissions counts delivered sales).
 */
export function useApproveSale() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from('sales')
        .update({
          status: 'delivered',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['my-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions-live'] });
      toast({
        title: 'Instalação confirmada',
        description: 'A comissão passou a confirmada na vista do comercial.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao confirmar',
        description: error?.message || 'Não foi possível confirmar a instalação.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Revert an approval: send the sale back to in_progress and clear the
 * audit fields. Useful when an admin marked something by mistake.
 */
export function useUnapproveSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'in_progress', approved_by: null, approved_at: null })
        .eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['my-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions-live'] });
      toast({
        title: 'Aprovação revertida',
        description: 'A venda voltou para "Em curso".',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reverter',
        description: error?.message || 'Não foi possível reverter a aprovação.',
        variant: 'destructive',
      });
    },
  });
}

export interface MyCommissionSale {
  id: string;
  code: string | null;
  status: string;
  total_value: number;
  comissao: number | null;
  sale_date: string | null;
  activation_date: string | null;
  created_at: string;
  approved_at: string | null;
  client_name: string | null;
}

/**
 * The current user's personal sales: those whose client OR lead is assigned
 * to them, OR that they created. Returned for both admins and salespeople so
 * an admin who also works deals sees only their own here (the team view lives
 * in CommissionsWidget / Aprovar Instalações).
 */
export function useMyCommissions() {
  const { user, organization } = useAuth();
  const organizationId = organization?.id;
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-commissions', organizationId, userId],
    queryFn: async (): Promise<MyCommissionSale[]> => {
      if (!organizationId || !userId) return [];

      const [clientsRes, leadsRes] = await Promise.all([
        supabase
          .from('crm_clients')
          .select('id, name, company')
          .eq('organization_id', organizationId)
          .eq('assigned_to', userId),
        supabase
          .from('leads')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('assigned_to', userId),
      ]);
      const clients = clientsRes.data || [];
      const leads = leadsRes.data || [];
      const clientNameMap = new Map<string, string | null>(
        clients.map((c: any) => [c.id as string, (c.name as string) || (c.company as string) || null])
      );
      const leadNameMap = new Map<string, string | null>(
        leads.map((l: any) => [l.id as string, (l.name as string) || null])
      );

      const filters: string[] = [`created_by.eq.${userId}`];
      if (clients.length > 0) filters.push(`client_id.in.(${clients.map(c => c.id).join(',')})`);
      if (leads.length > 0) filters.push(`lead_id.in.(${leads.map(l => l.id).join(',')})`);

      const { data: sales, error } = await supabase
        .from('sales')
        .select('id, code, status, total_value, comissao, sale_date, activation_date, created_at, approved_at, client_id, lead_id')
        .eq('organization_id', organizationId)
        .or(filters.join(','))
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!sales) return [];

      return sales.map((s: any) => ({
        id: s.id,
        code: s.code,
        status: s.status,
        total_value: s.total_value,
        comissao: s.comissao,
        sale_date: s.sale_date,
        activation_date: s.activation_date,
        created_at: s.created_at,
        approved_at: s.approved_at,
        client_name:
          (s.client_id && clientNameMap.get(s.client_id)) ||
          (s.lead_id && leadNameMap.get(s.lead_id)) ||
          null,
      }));
    },
    enabled: !!organizationId && !!userId,
  });
}
