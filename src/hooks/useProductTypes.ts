import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { DEFAULT_PRODUCT_TYPES, type ProductType } from '@/types/product-types';

/**
 * The organization's product types, falling back to the seeded defaults while
 * nobody has configured any. Reading the defaults rather than writing them on
 * sign-up means an org that never opens the screen carries no config, and a
 * later change to the defaults reaches it.
 */
export function useProductTypes() {
  const { data: org } = useOrganization();
  const stored = (org as any)?.product_types_config as ProductType[] | null | undefined;

  return useMemo(() => {
    const all = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_PRODUCT_TYPES;
    return {
      /** Everything, including archived — needed to name a product's old type. */
      all,
      /** What a product may be classified under today. */
      active: all.filter((t) => !t.archived),
      /** Whether the org has saved its own list, or is still on the defaults. */
      isDefault: !(Array.isArray(stored) && stored.length > 0),
      byId: new Map(all.map((t) => [t.id, t])),
    };
  }, [stored]);
}

export function useSaveProductTypes() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (types: ProductType[]) => {
      if (!organization?.id) throw new Error('Sem organização ativa.');
      const { error } = await (supabase as any)
        .from('organizations')
        .update({ product_types_config: types })
        .eq('id', organization.id);
      if (error) throw error;
      return types;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['servicos-products'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Não foi possível guardar os tipos.'),
  });
}
