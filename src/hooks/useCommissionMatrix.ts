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
  // Only used for tiered_kwp
  tiers: SolarTier[];
  // Used in base_plus_per_kwp
  baseTrans?: number;
  ratePerKwpTrans?: number;
  baseAas?: number;
  ratePerKwpAas?: number;
  // Used in formula_percentage
  factor?: number;
  divisor?: number;
  pctTrans?: number;
  pctAas?: number;
  // percentage_valor reuses pctTrans / pctAas
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
      if (!rule) return null;

      const isAas = modeloServico === 'saas';

      switch (rule.method) {
        case 'tiered_kwp': {
          const kwp = detail.kwp;
          if (kwp == null || !rule.tiers?.length) return null;
          const tier = findTier(rule.tiers, kwp);
          if (!tier) return null;
          const base = isAas ? tier.baseAas : tier.baseTransaccional;
          const adic = isAas ? tier.adicAas : tier.adicTransaccional;
          return base + (kwp - tier.kwpMin) * adic;
        }
        case 'base_plus_per_kwp': {
          const kwp = detail.kwp;
          if (kwp == null) return null;
          const base = isAas ? (rule.baseAas ?? 0) : (rule.baseTrans ?? 0);
          const rate = isAas ? (rule.ratePerKwpAas ?? 0) : (rule.ratePerKwpTrans ?? 0);
          return base + rate * kwp;
        }
        case 'formula_percentage': {
          if (detail.valor == null) return null;
          const factor = rule.factor ?? 1;
          const divisor = rule.divisor ?? 1;
          if (divisor === 0) return null;
          const derivedKwp = (detail.valor * factor) / divisor;
          const pct = isAas ? (rule.pctAas ?? 0) : (rule.pctTrans ?? 0);
          return (derivedKwp * pct) / 100;
        }
        case 'percentage_valor': {
          if (detail.valor == null) return null;
          const pct = isAas ? (rule.pctAas ?? 0) : (rule.pctTrans ?? 0);
          return (detail.valor * pct) / 100;
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
      if (!rule) return false;
      if (rule.method === 'tiered_kwp') return !!rule.tiers?.length;
      // For non-tiered methods, considered configured if any value is set
      return true;
    },
    [matrix]
  );

  return { matrix, calculateCommission, isAutoCalculated };
}
