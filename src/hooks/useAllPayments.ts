import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PaymentWithSale } from '@/types/finance';
import type { PaymentMethod, PaymentRecordStatus } from '@/types/sales';

export function useAllPayments() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['all-payments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('sale_payments')
        .select(`
          *,
          sales:sale_id (
            id,
            code,
            total_value,
            leads:lead_id (name),
            crm_clients:client_id (name)
          )
        `)
        .eq('organization_id', organizationId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      return (data || []).map((payment): PaymentWithSale => ({
        id: payment.id,
        organization_id: payment.organization_id,
        sale_id: payment.sale_id,
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method as PaymentMethod | null,
        invoice_reference: payment.invoice_reference,
        invoice_file_url: payment.invoice_file_url,
        status: payment.status as PaymentRecordStatus,
        notes: payment.notes,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        sale: {
          id: payment.sales?.id || '',
          code: payment.sales?.code || '',
          total_value: Number(payment.sales?.total_value || 0),
        },
        client_name: payment.sales?.crm_clients?.name || null,
        lead_name: payment.sales?.leads?.name || null,
      }));
    },
    enabled: !!organizationId,
  });
}
