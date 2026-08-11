import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// All messaging channels for the active organization.
export function useMessagingChannels() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['messaging-channels', organization?.id],
    queryFn: async (): Promise<MessagingChannel[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('messaging_channels')
        .select('*')
        .eq('organization_id', organization.id)
        // Stable order: without it Postgres returns rows in physical/heap order,
        // which changes whenever a row is UPDATEd — making the cards jump around
        // every time a caixa is edited. created_at + id is deterministic.
        .order('created_at', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []) as MessagingChannel[];
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
      const { error } = await supabase
        .from('messaging_channels')
        .update(patch)
        .eq('id', vars.channelId)
        .eq('organization_id', organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
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
        body: { action: 'oauth_url', organization_id: organization.id, connect, label },
      });
      if (error) throw error;
      const url = (data as { url?: string; error?: string })?.url;
      if (!url) throw new Error((data as { error?: string })?.error || 'Não foi possível iniciar o login');

      const popup = window.open(url, 'meta-oauth', 'width=600,height=760');
      if (!popup) throw new Error('O browser bloqueou a janela. Permite popups para este site.');

      return await new Promise<{ channel_type: string; label: string; ig_username?: string | null }>((resolve, reject) => {
        // Duas formas de isto acabar: a mensagem do callback, ou o utilizador
        // fechar o popup. Sem a segunda, uma desistência ficava pendurada para
        // sempre num spinner.
        const timer = setInterval(() => {
          if (popup.closed) { cleanup(); reject(new Error('Janela fechada antes de concluir.')); }
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}
