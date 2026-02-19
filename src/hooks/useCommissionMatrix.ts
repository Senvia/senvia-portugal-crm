import { useCallback } from 'react';
import { useOrganization } from './useOrganization';
import type { ServicosProductDetail } from '@/types/proposals';

export interface CommissionRule {
  method: 'per_kwp' | 'percentage_valor' | 'fixed' | 'manual';
  rate: number;
}

export type CommissionMatrix = Record<string, CommissionRule>;

export function useCommissionMatrix() {
  const { data: org } = useOrganization();

  const matrix: CommissionMatrix | null = (org as any)?.commission_matrix ?? null;

  const calculateCommission = useCallback(
    (productName: string, detail: ServicosProductDetail): number | null => {
      if (!matrix) return null;
      const rule = matrix[productName];
      if (!rule || rule.method === 'manual') return null;

      switch (rule.method) {
        case 'per_kwp':
          return detail.kwp != null ? detail.kwp * rule.rate : null;
        case 'percentage_valor':
          return detail.valor != null ? (detail.valor * rule.rate) / 100 : null;
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
