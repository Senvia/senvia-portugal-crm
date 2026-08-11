import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// As tabelas meta_* são mais recentes do que os tipos gerados do Supabase, por
// isso o cliente tipado não as conhece. Mesmo padrão já usado noutros hooks do
// projeto (ver useActivationProgress e org_onboarding_state). Os tipos das
// linhas estão declarados abaixo e são o contrato real.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Conversas de Instagram e Messenger — lidas das NOSSAS tabelas.
 *
 * Estes canais não passam pelo Chatwoot: o webhook da Meta escreve em
 * meta_conversations / meta_messages e é daí que se lê. O email continua no
 * Chatwoot, por isso a Caixa de Entrada tem duas origens.
 */

export interface MetaConversation {
  id: string;
  channel_id: string;
  contact_ref: string;
  contact_name: string | null;
  contact_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  window_expires_at: string | null;
}

export interface MetaMessage {
  id: string;
  conversation_id: string;
  direction: 'incoming' | 'outgoing';
  content: string | null;
  attachments: Array<{ type: string; url: string | null }>;
  sent_by: string | null;
  created_at: string;
}

/** Conversas de uma caixa, mais recentes primeiro. */
export function useMetaConversations(channelId: string | null) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['meta-conversations', organization?.id, channelId],
    queryFn: async (): Promise<MetaConversation[]> => {
      if (!organization?.id || !channelId) return [];
      const { data, error } = await db
        .from('meta_conversations')
        .select('id, channel_id, contact_ref, contact_name, contact_avatar_url, last_message, last_message_at, unread_count, status, window_expires_at')
        .eq('organization_id', organization.id)
        .eq('channel_id', channelId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as MetaConversation[];
    },
    enabled: !!organization?.id && !!channelId,
    // As mensagens chegam por webhook, não por ação do utilizador — sem
    // sondagem a conversa só apareceria ao recarregar a página.
    refetchInterval: 15_000,
  });
}

/** Mensagens de uma conversa, por ordem cronológica. */
export function useMetaMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['meta-messages', conversationId],
    queryFn: async (): Promise<MetaMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await db
        .from('meta_messages')
        .select('id, conversation_id, direction, content, attachments, sent_by, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MetaMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 10_000,
  });
}

/** Responder. O envio é feito na edge function: o token da Página nunca vem ao browser. */
export function useSendMetaMessage() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-send', {
        body: { conversation_id: conversationId, text },
      });
      if (error) {
        // O invoke() deita fora o corpo do erro, que é onde está o motivo — por
        // exemplo a janela de 24h ter expirado, que o utilizador precisa de ler.
        let detail = '';
        try {
          const body = await (error as { context?: Response }).context?.json();
          detail = body?.error ?? '';
        } catch { /* corpo não era JSON */ }
        throw new Error(detail || (error as Error).message);
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meta-messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['meta-conversations', organization?.id] });
    },
  });
}

/** Marca como lida (zera o contador). */
export function useMarkMetaRead() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await db
        .from('meta_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-conversations', organization?.id] });
    },
  });
}
