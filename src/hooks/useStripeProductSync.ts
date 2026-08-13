import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ProductStripeStatus = 'not_synced' | 'synced' | 'disabled' | 'error' | 'pending';

export interface ProductStripeMappingSummary {
  status: ProductStripeStatus;
  stripeProductId: string | null;
  stripePriceId: string | null;
  syncedAt: string | null;
  syncError: string | null;
}

export const NOT_SYNCED: ProductStripeMappingSummary = {
  status: 'not_synced',
  stripeProductId: null,
  stripePriceId: null,
  syncedAt: null,
  syncError: null,
};

interface MappingRow {
  product_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  active: boolean;
  synced_at: string | null;
  sync_error: string | null;
}

/**
 * Mapeamentos Stripe de todos os produtos da organização.
 *
 * Uma consulta só para o catálogo inteiro, em vez de uma por linha: a tabela de
 * produtos mostra dezenas de itens, e um pedido por item transformava a página
 * numa cascata de chamadas.
 */
export function useStripeProductMappings() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['stripe-product-mappings', organizationId],
    queryFn: async (): Promise<Record<string, ProductStripeMappingSummary>> => {
      if (!organizationId) return {};
      const { data, error } = await supabase
        .from('stripe_product_mappings')
        .select('product_id, stripe_product_id, stripe_price_id, active, synced_at, sync_error')
        .eq('organization_id', organizationId);
      if (error) throw error;

      const rows = (data ?? []) as MappingRow[];
      return rows.reduce<Record<string, ProductStripeMappingSummary>>((acc, row) => {
        acc[row.product_id] = {
          status: row.sync_error ? 'error' : row.active ? 'synced' : 'disabled',
          stripeProductId: row.stripe_product_id,
          stripePriceId: row.stripe_price_id,
          syncedAt: row.synced_at,
          syncError: row.sync_error,
        };
        return acc;
      }, {});
    },
    enabled: !!organizationId,
  });
}

interface SyncResponse {
  mapping?: ProductStripeMappingSummary;
  error?: string;
}

/** Acção de sincronizar/desligar um produto. */
export function useStripeProductSync() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { productId: string; action: 'enable' | 'sync' | 'disable' }) => {
      const { data, error } = await supabase.functions.invoke<SyncResponse>('stripe-product-sync', {
        body: input,
      });
      if (error) {
        // A edge function devolve a razão no corpo; o FunctionsHttpError só traz
        // "non-2xx status", que não diz nada ao utilizador.
        const detail = data?.error;
        throw new Error(detail ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data?.mapping ?? NOT_SYNCED;
    },
    onSuccess: (_mapping, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-product-mappings', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(
        variables.action === 'disable' ? 'Produto desligado do Stripe' : 'Produto sincronizado com o Stripe',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível sincronizar com o Stripe');
    },
  });

  return {
    sync: mutation.mutate,
    syncAsync: mutation.mutateAsync,
    isSyncing: mutation.isPending,
  };
}
