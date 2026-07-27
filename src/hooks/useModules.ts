import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface EnabledModules {
  proposals: boolean;
  calendar: boolean;
  sales: boolean;
  ecommerce: boolean;
  clients: boolean;
  marketing: boolean;
  finance: boolean;
  energy: boolean;
  prospects: boolean;
  inbox: boolean;
}

export const DEFAULT_MODULES: EnabledModules = {
  proposals: true,
  calendar: true,
  sales: true,
  ecommerce: false,
  clients: true,
  marketing: false,
  finance: true,
  energy: true,
  prospects: false,
  inbox: true,
};

// Module keys that are restricted by plan tier. Core modules (clients, inbox,
// calendar, energy, proposals) are always available and NOT listed here.
const MODULE_REQUIRED_RANK: Record<string, number> = {
  sales: 0,     // Starter+
  marketing: 1, // Pro+
  finance: 2,   // Elite+
  ecommerce: 2, // Elite+
  prospects: 2, // Elite+
};

// Plan tier ranks. Must match subscription_plans.features.modules in the DB.
const PLAN_RANK: Record<string, number> = {
  basic: 0,
  starter: 0,
  pro: 1,
  elite: 2,
};

function isOrgOnTrial(org: any): boolean {
  if (!org) return false;
  if (org.billing_exempt) return false;
  if (org.first_paid_at) return false;
  const trialEnd = org.trial_ends_at;
  if (!trialEnd) return false;
  return new Date(trialEnd).getTime() > Date.now();
}

export function useModules() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['modules', organizationId],
    queryFn: async () => {
      if (!organizationId) return DEFAULT_MODULES;

      const { data, error } = await supabase
        .from('organizations')
        .select('enabled_modules')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error fetching modules:', error);
        return DEFAULT_MODULES;
      }

      const enabledModules = data?.enabled_modules as Record<string, boolean> | null;

      // Merge DB overrides on top of defaults.
      const merged = {
        ...DEFAULT_MODULES,
        ...(enabledModules || {}),
      } as EnabledModules;

      // Enforce plan restrictions: modules gated by plan tier are force-disabled
      // when the org's plan doesn't reach the required rank. Trial orgs get elite
      // access (full rank).
      const onTrial = isOrgOnTrial(organization as any);
      const planRank = onTrial ? 2 : (PLAN_RANK[organization?.plan || 'starter'] ?? 0);
      for (const [key, requiredRank] of Object.entries(MODULE_REQUIRED_RANK)) {
        if (planRank < requiredRank && key in merged) {
          (merged as any)[key] = false;
        }
      }

      return merged;
    },
    enabled: !!organizationId,
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ module, enabled }: { module: keyof EnabledModules; enabled: boolean }) => {
      if (!organizationId) throw new Error('No organization');

      const currentModules = modules || DEFAULT_MODULES;
      const newModules = { ...currentModules, [module]: enabled };

      const { error } = await supabase
        .from('organizations')
        .update({ enabled_modules: newModules as unknown as Json })
        .eq('id', organizationId);

      if (error) throw error;
      return newModules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Módulo atualizado');
    },
    onError: (error) => {
      console.error('Error updating module:', error);
      toast.error('Erro ao atualizar módulo');
    },
  });

  const updateAllModulesMutation = useMutation({
    mutationFn: async (newModules: EnabledModules) => {
      if (!organizationId) throw new Error('No organization');

      const { error } = await supabase
        .from('organizations')
        .update({ enabled_modules: newModules as unknown as Json })
        .eq('id', organizationId);

      if (error) throw error;
      return newModules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
    onError: (error) => {
      console.error('Error updating modules:', error);
    },
  });

  return {
    modules: modules || DEFAULT_MODULES,
    isLoading,
    updateModule: updateModuleMutation.mutate,
    updateAllModules: updateAllModulesMutation.mutateAsync,
    isUpdating: updateModuleMutation.isPending || updateAllModulesMutation.isPending,
  };
}
