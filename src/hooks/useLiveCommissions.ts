import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useTeamMembers } from '@/hooks/useTeam';
import {
  calculateEnergyCommissionPure,
  getVolumeTier,
  type EnergyCommissionConfig,
  type EnergyVolumeTier,
} from '@/hooks/useCommissionMatrix';
import { format, endOfMonth } from 'date-fns';

const VALID_NEGOTIATION_TYPES = ['angariacao', 'angariacao_indexado'];

export interface CpeDetail {
  sale_id: string;
  sale_code: string | null;
  proposal_cpe_id: string;
  serial_number: string | null;
  consumo_anual: number;
  margem: number;
  comissao_indicativa: number;
  comissao_final: number;
  negotiation_type: string;
}

export interface CommercialEntry {
  userId: string;
  name: string;
  totalConsumoKwh: number;
  totalConsumoMwh: number;
  tier: EnergyVolumeTier;
  totalIndicativa: number;
  totalFinal: number;
  cpes: CpeDetail[];
}

export interface LiveCommissionsData {
  commercials: CommercialEntry[];
  globalMwh: number;
  globalTier: EnergyVolumeTier;
  totalCommission: number;
}

export function useLiveCommissions(selectedMonth: string) {
  const { organization } = useAuth();
  const { data: org } = useOrganization();
  const { data: members } = useTeamMembers();
  const organizationId = organization?.id;

  const energyConfig: EnergyCommissionConfig | null = (org as any)?.commission_matrix?.ee_gas ?? null;

  const getMemberName = (userId: string) => {
    if (userId === 'unassigned') return 'Sem Comercial';
    const m = members?.find((m: any) => m.user_id === userId);
    return m?.full_name || 'Desconhecido';
  };

  return useQuery<LiveCommissionsData>({
    queryKey: ['commissions-live', organizationId, selectedMonth, members?.length, energyConfig?.bands?.length],
    queryFn: async (): Promise<LiveCommissionsData> => {
      if (!organizationId) return { commercials: [], globalMwh: 0, globalTier: 'low', totalCommission: 0 };

      const monthStart = selectedMonth;
      const monthEnd = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      // Get delivered sales filtered by activation_date
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, code, lead_id, client_id, activation_date, status, proposal_id')
        .eq('organization_id', organizationId)
        .eq('status', 'delivered')
        .gte('activation_date', monthStart)
        .lte('activation_date', monthEnd);

      if (salesError) throw salesError;
      if (!sales?.length) return { commercials: [], globalMwh: 0, globalTier: 'low', totalCommission: 0 };

      // Get client assigned_to
      const clientIds = [...new Set(sales.map(s => s.client_id).filter(Boolean))] as string[];
      const { data: clients } = clientIds.length > 0
        ? await supabase
            .from('crm_clients')
            .select('id, assigned_to')
            .in('id', clientIds)
        : { data: [] };

      const clientMap = new Map((clients || []).map(c => [c.id, c.assigned_to]));

      // Get proposals with negotiation_type filter
      const proposalIds = [...new Set(sales.map(s => s.proposal_id).filter(Boolean))] as string[];
      if (!proposalIds.length) return { commercials: [], globalMwh: 0, globalTier: 'low', totalCommission: 0 };

      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, negotiation_type')
        .in('id', proposalIds)
        .in('negotiation_type', VALID_NEGOTIATION_TYPES);

      if (!proposals?.length) return { commercials: [], globalMwh: 0, globalTier: 'low', totalCommission: 0 };

      const validProposalIds = proposals.map(p => p.id);
      const proposalNegotiationMap = new Map(proposals.map(p => [p.id, p.negotiation_type]));

      // Map proposal_id -> sale_id
      const proposalToSale = new Map<string, string>();
      for (const s of sales) {
        if (s.proposal_id && validProposalIds.includes(s.proposal_id)) {
          proposalToSale.set(s.proposal_id, s.id);
        }
      }

      const { data: cpes } = await supabase
        .from('proposal_cpes')
        .select('id, proposal_id, consumo_anual, margem, comissao, serial_number')
        .in('proposal_id', validProposalIds);

      if (!cpes?.length) return { commercials: [], globalMwh: 0, globalTier: 'low', totalCommission: 0 };

      // Group by commercial
      const byCommercial = new Map<string, CommercialEntry>();
      let totalGlobalKwh = 0;

      for (const cpe of cpes) {
        const saleId = proposalToSale.get(cpe.proposal_id);
        if (!saleId) continue;
        const sale = sales.find(s => s.id === saleId);
        if (!sale) continue;
        const assignedTo = (sale.client_id ? clientMap.get(sale.client_id) : null) || 'unassigned';

        if (!byCommercial.has(assignedTo)) {
          byCommercial.set(assignedTo, {
            userId: assignedTo,
            name: getMemberName(assignedTo),
            totalConsumoKwh: 0,
            totalConsumoMwh: 0,
            tier: 'low',
            totalIndicativa: 0,
            totalFinal: 0,
            cpes: [],
          });
        }

        const entry = byCommercial.get(assignedTo)!;
        const consumo = cpe.consumo_anual || 0;
        entry.totalConsumoKwh += consumo;
        totalGlobalKwh += consumo;
        entry.totalIndicativa += cpe.comissao || 0;
        entry.cpes.push({
          sale_id: saleId,
          sale_code: sale.code || null,
          proposal_cpe_id: cpe.id,
          serial_number: cpe.serial_number,
          consumo_anual: consumo,
          margem: cpe.margem || 0,
          comissao_indicativa: cpe.comissao || 0,
          comissao_final: 0,
          negotiation_type: proposalNegotiationMap.get(cpe.proposal_id) || '',
        });
      }

      // Global totalizer
      const globalMwh = totalGlobalKwh / 1000;
      const globalTier = getVolumeTier(totalGlobalKwh);

      // Recalculate commissions per commercial using their own tier
      for (const entry of byCommercial.values()) {
        entry.totalConsumoMwh = entry.totalConsumoKwh / 1000;
        entry.tier = getVolumeTier(entry.totalConsumoKwh);
        entry.name = getMemberName(entry.userId);

        let totalFinal = 0;
        for (const cpe of entry.cpes) {
          if (energyConfig && energyConfig.bands.length > 0) {
            const final_ = calculateEnergyCommissionPure(cpe.margem, energyConfig, entry.tier);
            cpe.comissao_final = final_ ?? cpe.comissao_indicativa;
          } else {
            cpe.comissao_final = cpe.comissao_indicativa;
          }
          totalFinal += cpe.comissao_final;
        }
        entry.totalFinal = totalFinal;
      }

      const commercials = Array.from(byCommercial.values()).sort((a, b) => b.totalFinal - a.totalFinal);
      const totalCommission = commercials.reduce((sum, p) => sum + p.totalFinal, 0);

      return { commercials, globalMwh, globalTier, totalCommission };
    },
    enabled: !!organizationId && !!selectedMonth,
  });
}
