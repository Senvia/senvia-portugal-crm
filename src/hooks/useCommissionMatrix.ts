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

// --- Energy (EE & Gás) commission types ---

export interface EnergyMarginBand {
  marginMin: number;
  ponderadorLow: number;   // 300 MWh
  valorLow: number;
  ponderador: number;      // 301-600 MWh (reference)
  valor: number;
  ponderadorHigh: number;  // 601+ MWh
  valorHigh: number;
}

export type EnergyVolumeTier = 'low' | 'mid' | 'high';

export interface TierDerivationRule {
  source: 'from_low' | 'from_mid' | 'from_high';
  operation: 'multiply' | 'divide';
  value: number;
}

export interface TierRules {
  low: TierDerivationRule;
  mid: TierDerivationRule;
  high: TierDerivationRule;
}

export const DEFAULT_TIER_RULES: TierRules = {
  low:  { source: 'from_mid', operation: 'divide',   value: 1.33 },
  mid:  { source: 'from_mid', operation: 'multiply', value: 1 },
  high: { source: 'from_mid', operation: 'multiply', value: 1.5 },
};

export interface EnergyCommissionConfig {
  bands: EnergyMarginBand[];
  tierRules?: TierRules;
}

export const DEFAULT_ENERGY_CONFIG: EnergyCommissionConfig = {
  bands: [],
};

function findTier(tiers: SolarTier[], kwp: number): SolarTier | null {
  return tiers.find(t => kwp >= t.kwpMin && kwp <= t.kwpMax) ?? null;
}

// --- Energy commission calculation ---

function findEnergyBand(bands: EnergyMarginBand[], margem: number): EnergyMarginBand | null {
  const sorted = [...bands].sort((a, b) => b.marginMin - a.marginMin);
  return sorted.find(b => margem >= b.marginMin) ?? null;
}

export function calculateEnergyCommissionPure(
  margem: number,
  config: EnergyCommissionConfig,
  tier: EnergyVolumeTier = 'mid'
): number | null {
  if (!config.bands.length) return null;
  
  const band = findEnergyBand(config.bands, margem);
  if (!band) return null;
  
  let ponderador: number;
  let valor: number;
  switch (tier) {
    case 'low':
      ponderador = band.ponderadorLow;
      valor = band.valorLow;
      break;
    case 'high':
      ponderador = band.ponderadorHigh;
      valor = band.valorHigh;
      break;
    default:
      ponderador = band.ponderador;
      valor = band.valor;
  }
  
  return valor + (margem - band.marginMin) * (ponderador / 100);
}

// --- Main hook ---

export function useCommissionMatrix() {
  const { data: org } = useOrganization();

  const matrix: CommissionMatrix | null = (org as any)?.commission_matrix ?? null;
  const energyConfig: EnergyCommissionConfig | null = (org as any)?.commission_matrix?.ee_gas ?? null;

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
          let tier = findTier(rule.tiers, kwp);
          let effectiveKwp = kwp;
          if (!tier) {
            const lastTier = rule.tiers[rule.tiers.length - 1];
            if (kwp > lastTier.kwpMax) {
              tier = lastTier;
              effectiveKwp = lastTier.kwpMax;
            }
          }
          if (!tier) return null;
          const base = isAas ? tier.baseAas : tier.baseTransaccional;
          const adic = isAas ? tier.adicAas : tier.adicTransaccional;
          return base + (effectiveKwp - tier.kwpMin) * adic;
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
      return true;
    },
    [matrix]
  );

  const calculateEnergyCommission = useCallback(
    (margem: number, tier: EnergyVolumeTier = 'mid'): number | null => {
      if (!energyConfig) return null;
      return calculateEnergyCommissionPure(margem, energyConfig, tier);
    },
    [energyConfig]
  );

  const hasEnergyConfig = !!energyConfig && energyConfig.bands.length > 0;

  return { matrix, calculateCommission, isAutoCalculated, energyConfig, calculateEnergyCommission, hasEnergyConfig };
}
