import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CreditNoteItem } from '@/types/finance';

export function useCreditNotes() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['credit-notes', organizationId],
    queryFn: async (): Promise<CreditNoteItem[]> => {
      if (!organizationId) return [];

      const items: CreditNoteItem[] = [];

      // 1. Credit notes from sale_payments
      const { data: payments } = await supabase
        .from('sale_payments')
        .select(`
          id,
          amount,
          payment_date,
          credit_note_id,
          credit_note_reference,
          invoice_reference,
          invoice_file_url,
          sales:sale_id!inner (
            id,
            code,
            organization_id,
            leads:lead_id (name),
            crm_clients:client_id (name)
          )
        `)
        .eq('organization_id', organizationId)
        .not('credit_note_id', 'is', null);

      if (payments) {
        for (const p of payments) {
          items.push({
            id: p.id,
            type: 'payment',
            credit_note_id: (p as any).credit_note_id,
            credit_note_reference: (p as any).credit_note_reference || '-',
            original_document_reference: p.invoice_reference || null,
            date: p.payment_date,
            sale_code: (p.sales as any)?.code || '',
            sale_id: (p.sales as any)?.id || '',
            client_name: (p.sales as any)?.crm_clients?.name || (p.sales as any)?.leads?.name || null,
            amount: Number(p.amount),
            organization_id: organizationId,
            pdf_url: p.invoice_file_url || null,
          });
        }
      }

      // 2. Credit notes from sales (sale-level)
      const { data: sales } = await supabase
        .from('sales')
        .select(`
          id,
          code,
          total_value,
          credit_note_id,
          credit_note_reference,
          invoice_reference,
          invoice_pdf_url,
          created_at,
          leads:lead_id (name),
          crm_clients:client_id (name)
        `)
        .eq('organization_id', organizationId)
        .not('credit_note_id', 'is', null);

      if (sales) {
        for (const s of sales) {
          items.push({
            id: s.id,
            type: 'sale',
            credit_note_id: (s as any).credit_note_id,
            credit_note_reference: (s as any).credit_note_reference || '-',
            original_document_reference: (s as any).invoice_reference || null,
            date: s.created_at || '',
            sale_code: s.code || '',
            sale_id: s.id,
            client_name: (s as any).crm_clients?.name || (s as any).leads?.name || null,
            amount: Number(s.total_value),
            organization_id: organizationId,
            pdf_url: (s as any).invoice_pdf_url || null,
          });
        }
      }

      // Sort by date desc
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return items;
    },
    enabled: !!organizationId,
  });
}
