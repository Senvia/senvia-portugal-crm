import { useCallback } from 'react';
import { useOrganization } from './useOrganization';
import type { ServicosProductDetail } from '@/types/proposals';
import type { ModeloServico } from '@/types/proposals';
import { SERVICOS_PRODUCT_CONFIGS } from '@/types/proposals';

// --- Unified commission types ---

export interface SolarTier {
  kwpMin: number;
  kwpMax: number;
  baseTransaccional: number;
  adicTransaccional: number;
  baseAas: number;
  adicAas: number;
}

export interface CommissionRule {
  method: 'tiered_kwp' | 'base_plus_per_kwp' | 'formula_percentage' | 'percentage_valor';
  tiers: SolarTier[];
}

export type CommissionMatrix = Record<string, CommissionRule>;

function findTier(tiers: SolarTier[], kwp: number): SolarTier | null {
  return tiers.find(t => kwp >= t.kwpMin && kwp < t.kwpMax) ?? null;
}

export function useCommissionMatrix() {
  const { data: org } = useOrganization();

  const matrix: CommissionMatrix | null = (org as any)?.commission_matrix ?? null;

  const calculateCommission = useCallback(
    (productName: string, detail: ServicosProductDetail, modeloServico?: ModeloServico): number | null => {
      if (!matrix) return null;
      const rule = matrix[productName];
      if (!rule || !rule.tiers?.length) return null;

      const isAas = modeloServico === 'saas';

      // For formula_percentage, derive kWp from product config
      let kwp = detail.kwp;

      switch (rule.method) {
        case 'tiered_kwp': {
          if (kwp == null) return null;
          const tier = findTier(rule.tiers, kwp);
          if (!tier) return null;
          const base = isAas ? tier.baseAas : tier.baseTransaccional;
          const adic = isAas ? tier.adicAas : tier.adicTransaccional;
          return base + (kwp - tier.kwpMin) * adic;
        }
        case 'base_plus_per_kwp': {
          if (kwp == null) return null;
          const tier = findTier(rule.tiers, kwp);
          if (!tier) return null;
          const base = isAas ? tier.baseAas : tier.baseTransaccional;
          const rate = isAas ? tier.adicAas : tier.adicTransaccional;
          return base + rate * kwp;
        }
        case 'formula_percentage': {
          // Derive kWp via product config's kwpAuto if available
          const config = SERVICOS_PRODUCT_CONFIGS.find(c => c.name === productName);
          const derivedKwp = config?.kwpAuto ? config.kwpAuto(detail) : kwp;
          if (derivedKwp == null) return null;
          const tier = findTier(rule.tiers, derivedKwp);
          if (!tier) return null;
          const pct = isAas ? tier.baseAas : tier.baseTransaccional;
          return (derivedKwp * pct) / 100;
        }
        case 'percentage_valor': {
          if (detail.valor == null) return null;
          const tier = kwp != null ? findTier(rule.tiers, kwp) : rule.tiers[0];
          if (!tier) return null;
          const rate = isAas ? tier.baseAas : tier.baseTransaccional;
          return (detail.valor * rate) / 100;
        }
        default:
          return null;
      }
    },
    [matrix]
  );

  const isAutoCalculated = useCallback(
    (productName: string): boolean => {
      if (!matrix) return false;
      const rule = matrix[productName];
      return !!rule && !!rule.tiers?.length;
    },
    [matrix]
  );

  return { matrix, calculateCommission, isAutoCalculated };
}
