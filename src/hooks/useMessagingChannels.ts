import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isChannelEnabled } from '@/lib/constants';

export type ChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MessagingChannel {
  id: string;
  organization_id: string;
  channel_type: string;
  provider: string;
  label: string | null;
  evolution_instance: string | null;
  chatwoot_inbox_id: number | null;
  status: ChannelStatus;
  phone_number: string | null;
  // Collaborators who attend this caixa (empty = everyone). Drives inbox
  // visibility, auto-assignment and notifications.
  assigned_user_ids: string[];
  rotate_enabled: boolean;
  color: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

// NOTA: este ficheiro já teve os hooks de ligação de WhatsApp e Instagram
// (ligar, estado, QR, logout, limpeza de órfãos, reparação de ligações e o
// OAuth do Instagram). Foram removidos com as edge functions respetivas — o
// produto deixou de ligar canais de mensagens. Sobra o que serve as caixas de
// EMAIL: listá-las e gerir quem as atende.

/**
 * As caixas da organização — só as dos canais que o produto tem abertos.
 *
 * A filtragem é AQUI, e não em cada sítio que usa isto. Uma linha de um canal
 * fechado continua na base de dados (não se apaga nada), mas para o CRM é como
 * se não existisse: o que está desligado no produto não conta, não aparece e
 * não notifica.
 *
 * Antes cada consumidor filtrava por sua conta, e os que se esqueciam deixavam
 * o canal fechado aparecer à mesma — o contador dizia "4 ligadas" em cima de
 * três caixas, o painel mostrava alertas de WhatsApp, e as conversas por ler do
 * WhatsApp somavam no distintivo do menu. Uma sessão viva no Evolution é
 * problema do Evolution; não tem que se ver do lado de cá.
 */
export function useMessagingChannels() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['messaging-channels', organization?.id],
    queryFn: async (): Promise<MessagingChannel[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('messaging_channels')
        // Colunas explícitas, e `metadata_public` em vez de `metadata`.
        //
        // O `metadata` cru tem as passwords de IMAP/SMTP e o token da Página; um
        // `select('*')` descarregava-os para o browser de qualquer membro da
        // organização. A coluna pública é o mesmo sem os segredos, e o Postgres
        // já recusa a crua a quem não é o servidor — mesmo que alguém volte a
        // escrever `*` aqui, não passa.
        .select(
          'id, organization_id, channel_type, provider, label, evolution_instance,'
          + ' chatwoot_inbox_id, status, phone_number, assigned_user_ids, rotate_enabled,'
          + ' color, created_at, updated_at, metadata_public',
        )
        .eq('organization_id', organization.id)
        // Stable order: without it Postgres returns rows in physical/heap order,
        // which changes whenever a row is UPDATEd — making the cards jump around
        // every time a caixa is edited. created_at + id is deterministic.
        .order('created_at', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown as Array<Record<string, unknown>>)
        .map(({ metadata_public, ...resto }) => ({
          ...resto,
          metadata: metadata_public ?? null,
        }) as MessagingChannel)
        .filter((c) => isChannelEnabled(c.channel_type));
    },
    enabled: !!organization?.id,
  });
}

// Convenience accessor for the WhatsApp channel only.

// Update which collaborators attend a caixa (+ optional round-robin). Admin-gated
// by RLS. Empty list = everyone can see it.
export function useUpdateChannelAssignment() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { channelId: string; label?: string; assigned_user_ids?: string[]; rotate_enabled?: boolean; color?: string | null }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const patch: Record<string, unknown> = {};
      if (vars.label !== undefined) patch.label = vars.label;
      if (vars.assigned_user_ids !== undefined) patch.assigned_user_ids = vars.assigned_user_ids;
      if (vars.rotate_enabled !== undefined) patch.rotate_enabled = vars.rotate_enabled;
      if (vars.color !== undefined) patch.color = vars.color;
      // O `.select()` no fim é o que torna isto verificável. Sem ele, um UPDATE
      // que o RLS não deixe passar devolve SUCESSO com zero linhas alteradas: o
      // interruptor voltava atrás sozinho, a cor não pegava, e não havia erro
      // nenhum a dizer porquê. Quem só é colaborador não pode mexer nas caixas
      // (a política exige o papel de administrador) e ficava a olhar.
      const { data, error } = await supabase
        .from('messaging_channels')
        .update(patch)
        .eq('id', vars.channelId)
        .eq('organization_id', organization.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          'Não foi possível guardar: só os administradores podem alterar as caixas.',
        );
      }
    },
    onError: (e) => {
      toast.error('Alteração não guardada', { description: (e as Error).message });
    },
    onSuccess: () => {
      // Cada campo desta janela guarda-se sozinho, mal se mexe nele. Sem uma
      // confirmação, mexer e não ver nada acontecer é indistinguível de estar
      // partido — e era exatamente essa a queixa.
      toast.success('Alteração guardada');
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['email-channels', organization?.id] });
    },
  });
}

// One-time silent repair: re-wires Evolution → Chatwoot for all connected channels.
// Runs automatically on first Caixas page load after the wiring-bug deploy.
// Uses localStorage flag so it only fires once per browser.

// Toggle group messages for a WhatsApp channel. Updates metadata in DB and
// re-applies the setting to the Evolution Chatwoot integration immediately.
export function useUpdateChannelGroups() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { channelId: string; groupsEnabled: boolean }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
        body: { organization_id: organization.id, action: 'update_groups', channel_id: vars.channelId, groups_enabled: vars.groupsEnabled },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// Log out a channel's WhatsApp session WITHOUT deleting it — the instance stays so

/**
 * Liga uma conta de Instagram ou uma Página do Messenger via Facebook Login for
 * Business (edge function `meta-connect`).
 *
 * Abre o diálogo da Meta num popup e espera pelo postMessage do callback. O
 * popup é preciso porque a Meta recusa ser embebida em iframe, e sair da página
 * perderia o estado do CRM.
 */
export function useConnectMetaChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connect, label }: { connect: 'instagram' | 'messenger'; label?: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      const { data, error } = await supabase.functions.invoke('meta-connect', {
        body: {
          action: 'oauth_url', organization_id: organization.id, connect, label,
          // Para onde o popup volta no fim. Vai assinado dentro do `state`, e é
          // o que permite fechar a janela sozinha: a edge function não consegue
          // servir HTML que o browser corra (a Supabase impõe text/plain).
          origin: window.location.origin,
        },
      });
      if (error) {
        // O invoke() só entrega "Edge Function returned a non-2xx status code" e
        // deita fora o corpo — que é onde está o motivo real. Vale a pena ir
        // buscá-lo: a diferença entre "500" e "falta o FACEBOOK_LOGIN_CONFIG_ID"
        // é a diferença entre adivinhar e resolver.
        let detail = '';
        try {
          const body = await (error as { context?: Response }).context?.json();
          detail = body?.error ?? '';
        } catch { /* corpo não era JSON — fica a mensagem genérica */ }
        throw new Error(detail || (error as Error).message);
      }
      const url = (data as { url?: string; error?: string })?.url;
      if (!url) throw new Error((data as { error?: string })?.error || 'Não foi possível iniciar o login');

      const popup = window.open(url, 'meta-oauth', 'width=600,height=760');
      if (!popup) throw new Error('O browser bloqueou a janela. Permite popups para este site.');

      const before = new Date().toISOString();

      const result = await new Promise<{ channel_type?: string; label?: string; ig_username?: string | null } | null>(
        (resolve, reject) => {
          // O popup acaba em /oauth/meta, no NOSSO domínio, e é de lá que vem o
          // postMessage — na edge function nunca corria, porque a Supabase serve
          // tudo como text/plain e o browser mostrava o código em vez de o
          // executar. Mesmo assim o fecho da janela continua a ser vigiado: se
          // por alguma razão a mensagem não chegar, fechar não distingue "ligou"
          // de "desistiu", e vai-se confirmar aos dados (abaixo).
          const timer = setInterval(() => {
            if (popup.closed) { cleanup(); resolve(null); }
          }, 700);
          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== 'meta-oauth') return;
            cleanup();
            if (event.data.error) reject(new Error(String(event.data.error)));
            else resolve(event.data);
          };
          const cleanup = () => {
            clearInterval(timer);
            window.removeEventListener('message', onMessage);
          };
          window.addEventListener('message', onMessage);
        },
      );

      if (result) return result as { channel_type: string; label: string; ig_username?: string | null };

      // Janela fechada sem mensagem: a única fonte de verdade é a base de dados.
      const wanted = connect === 'messenger' ? 'facebook' : 'instagram';
      const { data: created } = await supabase
        .from('messaging_channels')
        .select('channel_type, label, metadata_public')
        .eq('organization_id', organization.id)
        .eq('channel_type', wanted)
        .gte('created_at', before)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!created) throw new Error('Ligação não concluída — a janela foi fechada antes do fim.');
      return {
        channel_type: created.channel_type,
        label: created.label ?? '',
        ig_username: (created.metadata_public as { ig_username?: string } | null)?.ig_username ?? null,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

/**
 * Elimina uma caixa que não é de email (hoje: Instagram/Messenger).
 *
 * As caixas de email têm o seu próprio caminho (useDeleteEmailChannel → função
 * email-inbox), porque envolvem credenciais IMAP/SMTP. Estas não: apaga-se a
 * linha, protegida pelo RLS da organização, e avisa-se a Meta para deixar de
 * enviar webhooks desta Página.
 *
 * A remoção da subscrição é "melhor esforço": se falhar, a caixa desaparece do
 * CRM na mesma e a Meta fica a enviar mensagens que o webhook ignora por não
 * reconhecer a página. Preferível a recusar apagar por causa de uma chamada
 * externa que não controlamos.
 */
export function useDeleteChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      supabase.functions.invoke('meta-connect', {
        body: { action: 'disconnect', organization_id: organization.id, channel_id: channelId },
      }).catch(() => { /* melhor esforço — ver acima */ });

      const { error } = await supabase
        .from('messaging_channels')
        .delete()
        .eq('id', channelId)
        .eq('organization_id', organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}
