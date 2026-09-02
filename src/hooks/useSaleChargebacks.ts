import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ChargebackStatus = 'pending' | 'reconciled' | 'dismissed';

export interface SaleChargeback {
  id: string;
  organization_id: string;
  sale_id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: ChargebackStatus;
  created_at: string;
  updated_at: string;
  /** Joined for display. */
  sale?: { code: string | null; sale_date: string | null; client_id: string | null; total_value: number | null } | null;
  beneficiary_name?: string | null;
}

export const CHARGEBACK_STATUS_LABELS: Record<ChargebackStatus, string> = {
  pending: 'Por confirmar',
  reconciled: 'Confirmado',
  dismissed: 'Descartado',
};

/**
 * Commission staged for clawback when a telecom sale is cancelled after
 * install. Written server-side by sync_sale_chargebacks(); this hook only
 * reads them and lets an admin confirm/dismiss once the operator's own
 * chargeback file settles the matter.
 */
export function useSaleChargebacks() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['sale-chargebacks', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<SaleChargeback[]> => {
      const { data, error } = await (supabase as any)
        .from('sale_chargebacks')
        .select('*, sale:sales(code, sale_date, client_id, total_value)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as SaleChargeback[];
      const userIds = [...new Set(rows.map(r => r.user_id))];
      if (userIds.length === 0) return rows;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameById = new Map((profiles ?? []).map(p => [p.id, p.full_name]));

      return rows.map(r => ({ ...r, beneficiary_name: nameById.get(r.user_id) ?? null }));
    },
  });
}

export function useUpdateChargebackStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChargebackStatus }) => {
      const { error } = await (supabase as any)
        .from('sale_chargebacks')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-chargebacks'] });
      toast.success('Chargeback atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar chargeback: ${error.message}`);
    },
  });
}
