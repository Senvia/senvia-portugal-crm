import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CreditNoteRow {
  id: string;
  organization_id: string;
  invoicexpress_id: number;
  reference: string | null;
  status: string | null;
  client_name: string | null;
  total: number;
  date: string | null;
  related_invoice_id: number | null;
  sale_id: string | null;
  payment_id: string | null;
  pdf_path: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export function useCreditNotes() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['credit-notes', organizationId],
    queryFn: async (): Promise<CreditNoteRow[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching credit notes:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        invoicexpress_id: row.invoicexpress_id,
        reference: row.reference,
        status: row.status,
        client_name: row.client_name,
        total: Number(row.total || 0),
        date: row.date,
        related_invoice_id: row.related_invoice_id,
        sale_id: row.sale_id,
        payment_id: row.payment_id,
        pdf_path: row.pdf_path,
        raw_data: row.raw_data,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!organizationId,
  });
}

export function useSyncCreditNotes() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke('sync-credit-notes', {
        body: { organization_id: organization!.id },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as { total: number; synced: number; not_matched: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      toast({
        title: 'Sincronização concluída',
        description: `${data.total} notas de crédito encontradas, ${data.synced} associadas.${data.not_matched > 0 ? ` ${data.not_matched} não associadas.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Não foi possível sincronizar notas de crédito.',
        variant: 'destructive',
      });
    },
  });
}
