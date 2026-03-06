import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MarketingContact } from '@/types/marketing';

interface ConvertOptions {
  contacts: MarketingContact[];
  assignedTo?: string | null;
}

export function useConvertProspectToLead() {
  const { organization } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ contacts, assignedTo }: ConvertOptions) => {
      if (!organization?.id) throw new Error('Sem organização');

      let converted = 0;
      let skipped = 0;

      for (const contact of contacts) {
        // Check if already converted
        if ((contact as any).converted_to_lead) {
          skipped++;
          continue;
        }

        const { error: leadError } = await supabase
          .from('leads')
          .insert({
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            company_name: contact.company || undefined,
            source: 'prospect',
            organization_id: organization.id,
            assigned_to: assignedTo || undefined,
            gdpr_consent: true,
            status: 'new',
          });

        if (leadError) {
          console.error('Error converting contact:', leadError);
          continue;
        }

        // Mark as converted
        await supabase
          .from('marketing_contacts' as any)
          .update({ converted_to_lead: true })
          .eq('id', contact.id);

        converted++;
      }

      return { converted, skipped };
    },
    onSuccess: ({ converted, skipped }) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-list-members'] });
      const msg = skipped > 0
        ? `${converted} lead(s) criado(s), ${skipped} já convertido(s)`
        : `${converted} lead(s) criado(s) com sucesso`;
      toast.success(msg);
    },
    onError: () => toast.error('Erro ao converter contactos em leads'),
  });
}
