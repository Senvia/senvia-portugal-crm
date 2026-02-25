import { useCallback } from 'react';
import { useOrganization } from './useOrganization';
import type { ServicosProductDetail } from '@/types/proposals';
import type { ModeloServico } from '@/types/proposals';

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
  method: 'tiered_kwp' | 'base_plus_per_kwp' | 'percentage_valor' | 'per_kwp' | 'fixed' | 'manual';
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
      if (!rule || rule.method === 'manual' || !rule.tiers?.length) return null;

      const kwp = detail.kwp;
      const isAas = modeloServico === 'saas';

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
        case 'percentage_valor': {
          if (detail.valor == null) return null;
          // Use first tier's base as percentage rate, or find by kwp if available
          const tier = kwp != null ? findTier(rule.tiers, kwp) : rule.tiers[0];
          if (!tier) return null;
          const rate = isAas ? tier.baseAas : tier.baseTransaccional;
          return (detail.valor * rate) / 100;
        }
        case 'per_kwp': {
          if (kwp == null) return null;
          const tier = findTier(rule.tiers, kwp);
          if (!tier) return null;
          const rate = isAas ? tier.baseAas : tier.baseTransaccional;
          return kwp * rate;
        }
        case 'fixed': {
          const tier = kwp != null ? findTier(rule.tiers, kwp) : rule.tiers[0];
          if (!tier) return null;
          return isAas ? tier.baseAas : tier.baseTransaccional;
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
      return !!rule && rule.method !== 'manual';
    },
    [matrix]
  );

  return { matrix, calculateCommission, isAutoCalculated };
}
