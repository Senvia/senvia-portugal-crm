import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTelecomProposalMetrics() {
  const { organization } = useAuth();
  const isTelecom = organization?.niche === 'telecom';

  return useQuery({
    queryKey: ['telecom-proposal-metrics', organization?.id],
    queryFn: async () => {
      // Sum consumo_anual from proposal_cpes via join with proposals
      const { data: cpes, error: cpesError } = await supabase
        .from('proposal_cpes')
        .select('consumo_anual, proposal_id, proposals!inner(organization_id)')
        .eq('proposals.organization_id', organization!.id);

      if (cpesError) throw cpesError;

      const totalConsumo = (cpes || []).reduce(
        (sum, cpe) => sum + (Number(cpe.consumo_anual) || 0),
        0
      );

      // Sum kwp from proposals where proposal_type = 'servicos'
      const { data: servicosProposals, error: sError } = await supabase
        .from('proposals')
        .select('kwp')
        .eq('organization_id', organization!.id)
        .eq('proposal_type', 'servicos');

      if (sError) throw sError;

      const totalKWp = (servicosProposals || []).reduce(
        (sum, p) => sum + (Number(p.kwp) || 0),
        0
      );

      return {
        totalMWh: totalConsumo / 1000,
        totalKWp: totalKWp,
      };
    },
    enabled: !!organization?.id && isTelecom,
  });
}
