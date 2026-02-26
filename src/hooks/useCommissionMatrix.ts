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
  marginMin: number;      // Lower bound of the band (0, 500, 1000...)
  ponderador: number;     // % reference (e.g. 4.00)
  valor: number;          // € reference (e.g. 40)
}

export type EnergyVolumeTier = 'low' | 'mid' | 'high';

export interface EnergyCommissionConfig {
  bands: EnergyMarginBand[];
  volumeMultipliers: {
    low: number;   // divisor for 0-300 MWh (default 1.33)
    mid: number;   // reference 301-600 (always 1)
    high: number;  // multiplier for 601+ (default 1.5)
  };
}

export const DEFAULT_ENERGY_CONFIG: EnergyCommissionConfig = {
  bands: [],
  volumeMultipliers: { low: 1.33, mid: 1, high: 1.5 },
};

function findTier(tiers: SolarTier[], kwp: number): SolarTier | null {
  return tiers.find(t => kwp >= t.kwpMin && kwp <= t.kwpMax) ?? null;
}

// --- Energy commission calculation ---

function findEnergyBand(bands: EnergyMarginBand[], margem: number): EnergyMarginBand | null {
  // Find the highest band where margem >= marginMin
  const sorted = [...bands].sort((a, b) => b.marginMin - a.marginMin);
  return sorted.find(b => margem >= b.marginMin) ?? null;
}

function getVolumeMultiplier(config: EnergyCommissionConfig, tier: EnergyVolumeTier): number {
  switch (tier) {
    case 'low': return 1 / (config.volumeMultipliers.low || 1.33);
    case 'mid': return 1;
    case 'high': return config.volumeMultipliers.high || 1.5;
  }
}

export function calculateEnergyCommissionPure(
  margem: number,
  config: EnergyCommissionConfig,
  tier: EnergyVolumeTier = 'mid'
): number | null {
  if (!config.bands.length) return null;
  
  const band = findEnergyBand(config.bands, margem);
  if (!band) return null; // margem below all bands (e.g. negative)
  
  const multiplier = getVolumeMultiplier(config, tier);
  const valorAjustado = band.valor * multiplier;
  const ponderadorAjustado = band.ponderador * multiplier;
  
  return valorAjustado + (margem - band.marginMin) * (ponderadorAjustado / 100);
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
