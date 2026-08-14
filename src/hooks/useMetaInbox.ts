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
  external_id: string | null;
  direction: 'incoming' | 'outgoing';
  content: string | null;
  attachments: Array<{ type: string; url: string | null }>;
  sent_by: string | null;
  reply_to_external_id: string | null;
  reaction: string | null;
  reaction_by: string | null;
  /** A pessoa retirou a mensagem do lado dela. */
  is_deleted: boolean | null;
  /** Quando a Meta diz que foi enviada — é por aqui que se ordena. */
  sent_at: string | null;
  created_at: string;
}

/**
 * Por ler, por caixa de Meta.
 *
 * Sem isto o contador do menu e o distintivo de cada caixa só contavam o
 * Chatwoot: chegava uma DM de Instagram e nada no CRM o dizia — nem a barra
 * lateral, nem o título do separador. Só se descobria abrindo a caixa.
 */
export function useMetaUnreadTotals() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['meta-unread-totals', organization?.id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!organization?.id) return {};
      const { data, error } = await db
        .from('meta_conversations')
        .select('channel_id, unread_count')
        .eq('organization_id', organization.id)
        .gt('unread_count', 0);
      if (error) throw error;
      const totais: Record<string, number> = {};
      for (const linha of (data ?? []) as Array<{ channel_id: string; unread_count: number }>) {
        totais[linha.channel_id] = (totais[linha.channel_id] ?? 0) + (linha.unread_count ?? 0);
      }
      return totais;
    },
    enabled: !!organization?.id,
    refetchInterval: 30_000,
  });
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

/** Quantas mensagens se leem de uma vez. */
export const META_PAGINA = 200;

/**
 * Mensagens de uma conversa, por ordem cronológica.
 *
 * Lê-se do FIM para o princípio e inverte-se. Parece um pormenor e não é: o
 * PostgREST corta em 1000 linhas, e por ordem crescente o que ele guardava eram
 * as 1000 MAIS ANTIGAS. Uma conversa com mais do que isso congelava — as
 * mensagens novas ficavam guardadas na base de dados e nunca mais apareciam, sem
 * erro nenhum. O agente via uma conversa parada e o envio parecia não fazer nada.
 */
export function useMetaMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['meta-messages', conversationId],
    queryFn: async (): Promise<MetaMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await db
        .from('meta_messages')
        .select('id, conversation_id, external_id, direction, content, attachments, sent_by, reply_to_external_id, reaction, reaction_by, is_deleted, sent_at, created_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(META_PAGINA);
      if (error) throw error;
      return ((data || []) as MetaMessage[]).slice().reverse();
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
    mutationFn: async ({ conversationId, text, replyToMid }: { conversationId: string; text: string; replyToMid?: string | null }) => {
      const { data, error } = await supabase.functions.invoke('meta-send', {
        body: { conversation_id: conversationId, text, reply_to_mid: replyToMid ?? undefined },
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

/**
 * Marca como lida.
 *
 * Desconta o que foi visto em vez de escrever zero: uma mensagem que chegasse
 * entre a leitura e a escrita tinha o incremento deitado fora, e a conversa
 * ficava a dizer "lida" com uma mensagem por ler lá dentro.
 */
export function useMarkMetaRead() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, seen }: { conversationId: string; seen: number }) => {
      const { error } = await db.rpc('mark_meta_read', {
        _conversation_id: conversationId,
        _seen: seen,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-conversations', organization?.id] });
    },
  });
}

/**
 * Ações que não são mensagens: reagir, tirar a reação, "a escrever…" e "visto".
 *
 * Todas passam pela mesma edge function — é lá que está o token da Página, e é
 * lá que se sabe se a janela de 24h ainda está aberta.
 */
export function useMetaAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      conversationId: string;
      action: 'react' | 'unreact' | 'typing_on' | 'typing_off' | 'mark_seen';
      messageExternalId?: string | null;
      reaction?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('meta-send', {
        body: {
          conversation_id: vars.conversationId,
          action: vars.action,
          message_external_id: vars.messageExternalId,
          reaction: vars.reaction,
        },
      });
      if (error) {
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
      // "A escrever" e "visto" não mudam nada do nosso lado — recarregar seria
      // trabalho a troco de nada, e a cada tecla premida.
      if (vars.action === 'react' || vars.action === 'unreact') {
        queryClient.invalidateQueries({ queryKey: ['meta-messages', vars.conversationId] });
      }
    },
  });
}

/**
 * Envia um ficheiro. Sobe primeiro para o nosso armazenamento e manda o
 * endereço à Meta — ela vai buscá-lo, por isso tem de ser público.
 *
 * Limites da Meta, verificados antes de subir para não gastar a subida em vão:
 * imagens 8 MB (PNG/JPEG), áudio/vídeo/PDF 25 MB.
 */
export function useSendMetaAttachment() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, file }: { conversationId: string; file: File }) => {
      const ehImagem = file.type.startsWith('image/');
      const tipo = ehImagem ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'file';

      const limite = ehImagem ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > limite) {
        throw new Error(
          `O Instagram aceita no máximo ${ehImagem ? '8' : '25'} MB para este tipo de ficheiro.`,
        );
      }

      // Sem organização não há caminho válido — e o erro que vinha da política
      // do balde não dizia isso a ninguém.
      if (!organization?.id) throw new Error('Organização não encontrada. Recarrega a página.');

      // A ORGANIZAÇÃO TEM DE SER A PRIMEIRA PASTA. A política do balde faz
      // `is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)`, ou
      // seja converte o primeiro segmento para UUID. Começar por `meta/` fazia
      // o Postgres rebentar com «invalid input syntax for type uuid: "meta"» —
      // uma mensagem que não tem nada que ver com o que o utilizador fez.
      const caminho = `${organization.id}/meta/${conversationId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('automation-media')
        .upload(caminho, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`Falha ao carregar o ficheiro: ${upErr.message}`);

      const { data: pub } = supabase.storage.from('automation-media').getPublicUrl(caminho);

      // Se o envio falhar, o ficheiro sai. O caso comum é a janela de 24h ter
      // fechado: o agente escolhia um anexo, levava com o aviso, e o ficheiro
      // ficava público para sempre num contentor que ninguém limpa.
      const apagarFicheiro = async () => {
        await supabase.storage.from('automation-media').remove([caminho])
          .then(() => {}, () => { /* melhor esforço */ });
      };

      const { data, error } = await supabase.functions.invoke('meta-send', {
        body: {
          conversation_id: conversationId,
          attachment_url: pub.publicUrl,
          attachment_type: tipo,
        },
      });
      if (error) {
        let detail = '';
        try {
          const body = await (error as { context?: Response }).context?.json();
          detail = body?.error ?? '';
        } catch { /* corpo não era JSON */ }
        await apagarFicheiro();
        throw new Error(detail || (error as Error).message);
      }
      if ((data as { error?: string })?.error) {
        await apagarFicheiro();
        throw new Error((data as { error: string }).error);
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meta-messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['meta-conversations', organization?.id] });
    },
  });
}
