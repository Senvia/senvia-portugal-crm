import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type StripeConnectionStatus =
  | 'not_connected'
  | 'active'
  | 'restricted'
  | 'disconnected'
  | 'error';

export interface StripeConnectionSummary {
  connected: boolean;
  status: StripeConnectionStatus;
  mode: 'test' | 'live' | null;
  accountMasked: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  connectedAt: string | null;
  lastError: string | null;
}

const NOT_CONNECTED: StripeConnectionSummary = {
  connected: false,
  status: 'not_connected',
  mode: null,
  accountMasked: null,
  chargesEnabled: false,
  detailsSubmitted: false,
  connectedAt: null,
  lastError: null,
};

interface ConnectionResponse {
  connection?: StripeConnectionSummary;
  error?: string;
}

/**
 * Estado e acções da ligação Stripe da organização activa.
 *
 * A tabela `stripe_connections` tem RLS ligada e nenhuma policy de leitura, por
 * isso o cliente não lhe acede directamente — tudo passa pela edge function, que
 * devolve só o resumo seguro (conta mascarada, nunca tokens).
 */
export function useStripeConnection() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stripe-connection', organizationId],
    queryFn: async (): Promise<StripeConnectionSummary> => {
      if (!organizationId) return NOT_CONNECTED;
      const { data, error } = await supabase.functions.invoke<ConnectionResponse>('stripe-connect', {
        body: { action: 'status', organizationId },
      });
      if (error) throw error;
      return data?.connection ?? NOT_CONNECTED;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
  });

  const connect = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!organizationId) throw new Error('Sem organização activa');
      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        'stripe-connect',
        { body: { action: 'authorize', organizationId } },
      );
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error ?? 'Não foi possível iniciar a ligação');
      return data.url;
    },
    onSuccess: (url) => {
      // Navegação no mesmo separador: o Stripe devolve o utilizador ao CRM no
      // fim, e abrir noutro separador deixaria a página de origem desactualizada.
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível ligar ao Stripe');
    },
  });

  const disconnect = useMutation({
    mutationFn: async (): Promise<StripeConnectionSummary> => {
      if (!organizationId) throw new Error('Sem organização activa');
      const { data, error } = await supabase.functions.invoke<ConnectionResponse>('stripe-connect', {
        body: { action: 'disconnect', organizationId },
      });
      if (error) throw error;
      return data?.connection ?? NOT_CONNECTED;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connection', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['stripe-product-mappings', organizationId] });
      toast.success('Stripe desligado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível desligar');
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['stripe-connection', organizationId] });
  }, [queryClient, organizationId]);

  return {
    connection: query.data ?? NOT_CONNECTED,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh,
    connect: connect.mutate,
    isConnecting: connect.isPending,
    disconnect: disconnect.mutate,
    isDisconnecting: disconnect.isPending,
  };
}
