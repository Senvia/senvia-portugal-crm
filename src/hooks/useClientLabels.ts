import { useMemo } from 'react';
import { useOrganization } from './useOrganization';
import { getClientLabels, NicheLabels } from '@/lib/niche-labels';
import { NicheType } from '@/lib/pipeline-templates';

export function useClientLabels(): NicheLabels {
  const { data: org } = useOrganization();
  
  return useMemo(() => {
    const niche = (org?.niche as NicheType) || 'generic';
    return getClientLabels(niche);
  }, [org?.niche]);
}
