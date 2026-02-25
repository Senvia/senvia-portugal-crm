import { useCallback } from 'react';
import { useOrganization } from './useOrganization';
import type { ServicosProductDetail } from '@/types/proposals';
import type { ModeloServico } from '@/types/proposals';

// --- Types for the new configurable commission matrix ---

export interface SolarTier {
  kwpMin: number;
  kwpMax: number;
  baseTransaccional: number;
  adicTransaccional: number;
  baseAas: number;
  adicAas: number;
}

export interface TieredKwpRule {
  method: 'tiered_kwp';
  tiers: SolarTier[];
}

export interface BasePlusPerKwpRule {
  method: 'base_plus_per_kwp';
  base: number;
  ratePerKwp: number;
}

export interface PercentageValorRule {
  method: 'percentage_valor';
  rate: number;
}

export interface PerKwpRule {
  method: 'per_kwp';
  rate: number;
}

export interface FixedRule {
  method: 'fixed';
  rate: number;
}

export interface ManualRule {
  method: 'manual';
}

export type CommissionRule =
  | TieredKwpRule
  | BasePlusPerKwpRule
  | PercentageValorRule
  | PerKwpRule
  | FixedRule
  | ManualRule;

export type CommissionMatrix = Record<string, CommissionRule>;

export function useCommissionMatrix() {
  const { data: org } = useOrganization();

  const matrix: CommissionMatrix | null = (org as any)?.commission_matrix ?? null;

  const calculateCommission = useCallback(
    (productName: string, detail: ServicosProductDetail, modeloServico?: ModeloServico): number | null => {
      if (!matrix) return null;
      const rule = matrix[productName];
      if (!rule || rule.method === 'manual') return null;

      switch (rule.method) {
        case 'tiered_kwp': {
          if (detail.kwp == null || !rule.tiers?.length) return null;
          const kwp = detail.kwp;
          const tier = rule.tiers.find(t => kwp >= t.kwpMin && kwp < t.kwpMax);
          if (!tier) return null;
          const isAas = modeloServico === 'saas';
          const base = isAas ? tier.baseAas : tier.baseTransaccional;
          const adic = isAas ? tier.adicAas : tier.adicTransaccional;
          return base + (kwp - tier.kwpMin) * adic;
        }
        case 'base_plus_per_kwp': {
          if (detail.kwp == null) return null;
          return rule.base + rule.ratePerKwp * detail.kwp;
        }
        case 'percentage_valor': {
          if (detail.valor == null) return null;
          return (detail.valor * rule.rate) / 100;
        }
        case 'per_kwp': {
          if (detail.kwp == null) return null;
          return detail.kwp * rule.rate;
        }
        case 'fixed':
          return rule.rate;
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
