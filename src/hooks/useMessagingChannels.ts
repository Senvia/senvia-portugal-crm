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

interface ConnectResponse {
  success?: boolean;
  channel_id?: string;
  instance?: string;
  account_id?: number;
  chatwoot_inbox_id?: number | null;
  qr?: string | null;
  pairing_code?: string | null;
  already_connected?: boolean;
  error?: string;
}

interface StatusResponse {
  status: ChannelStatus;
  phone_number: string | null;
  qr?: string | null;
  error?: string;
}

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
export function useWhatsappChannel() {
  const query = useMessagingChannels();
  return {
    ...query,
    channel: (query.data || []).find((c) => c.channel_type === 'whatsapp') || null,
  };
}

// Provision + fetch the QR code to connect a WhatsApp channel. Pass channelId to
// reconnect an existing channel, or label (no channelId) to create a new one.
export function useWhatsappConnect() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars?: { channelId?: string; label?: string }): Promise<ConnectResponse> => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { organization_id: organization.id, channel_id: vars?.channelId, label: vars?.label },
      });
      if (error) throw error;
      if ((data as ConnectResponse)?.error) throw new Error((data as ConnectResponse).error);
      return data as ConnectResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// Delete (disconnect) a channel: full teardown via the edge function — removes the
// Evolution instance, the Chatwoot inbox AND the DB row (not just the row).
export function useDeleteChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('whatsapp-disconnect', {
        body: { organization_id: organization.id, channel_id: channelId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// Connect an Instagram channel via OAuth (Facebook login popup).
// Flow: get OAuth URL → open popup → user logs in → edge function callback
// → postMessage back → we resolve/reject.
export function useInstagramConnect() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { label: string }): Promise<{ ig_username?: string }> => {
      return new Promise(async (resolve, reject) => {
        if (!organization?.id) { reject(new Error('Organização não encontrada')); return; }

        // 1. Get OAuth URL from edge function
        const { data, error } = await supabase.functions.invoke('instagram-connect', {
          body: { action: 'oauth_url', organization_id: organization.id, label: vars.label },
        });
        if (error) { reject(error); return; }
        const url = (data as { url?: string })?.url;
        if (!url) { reject(new Error('Não foi possível obter o URL de login')); return; }

        // 2. Open popup centered on screen
        const w = 580, h = 700;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(url, 'instagram-oauth', `width=${w},height=${h},left=${left},top=${top}`);
        if (!popup) { reject(new Error('Popup bloqueado pelo navegador. Permite popups para este site.')); return; }

        // 3. Listen for postMessage from the edge function callback
        const handler = (ev: MessageEvent) => {
          if (ev.data?.type !== 'instagram-oauth') return;
          window.removeEventListener('message', handler);
          clearInterval(pollTimer);
          if (ev.data.error) {
            reject(new Error(ev.data.error));
          } else {
            resolve({ ig_username: ev.data.ig_username });
          }
        };
        window.addEventListener('message', handler);

        // 4. Detect popup closed manually (user closed without completing)
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            window.removeEventListener('message', handler);
            clearInterval(pollTimer);
            reject(new Error('Login cancelado'));
          }
        }, 800);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// Delete an Instagram channel (Chatwoot inbox + DB row).
export function useDeleteInstagramChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('instagram-connect', {
        body: { action: 'delete', organization_id: organization.id, channel_id: channelId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

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
export function useAutoRepairWiring() {
  const { organization } = useAuth();
  useEffect(() => {
    const key = `chatwoot-wiring-repaired-${organization?.id}`;
    if (!organization?.id || localStorage.getItem(key)) return;
    supabase.functions.invoke('chatwoot-inbox', {
      body: { organization_id: organization.id, action: 'repair_wiring' },
    }).then(({ data }) => {
      if ((data as any)?.ok) localStorage.setItem(key, '1');
    }).catch(() => {});
  }, [organization?.id]);
}

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
// it can be reconnected (re-scan QR). Status goes to 'disconnected'.
export function useLogoutChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('whatsapp-disconnect', {
        body: { organization_id: organization.id, channel_id: channelId, logout: true },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// One-shot cleanup of orphan channels: removes every non-connected channel of the
// org plus any leftover Evolution instances with the org's prefix.
export function useCleanupOrphanChannels() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('whatsapp-disconnect', {
        body: { organization_id: organization.id, cleanup: true },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
      return data as { deleted_instances?: string[]; deleted_rows?: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

// Poll the WhatsApp connection status for a specific channel. Enable while the QR
// modal is open. channelId targets the channel being connected (multi-account).
export function useWhatsappStatus(enabled: boolean, channelId?: string) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const prevStatusRef = useRef<ChannelStatus | null>(null);

  const query = useQuery({
    queryKey: ['whatsapp-status', organization?.id, channelId ?? null],
    queryFn: async (): Promise<StatusResponse> => {
      if (!organization?.id) return { status: 'disconnected', phone_number: null };
      const { data, error } = await supabase.functions.invoke('whatsapp-status', {
        body: { organization_id: organization.id, channel_id: channelId },
      });
      if (error) throw error;
      return data as StatusResponse;
    },
    enabled: enabled && !!organization?.id,
    refetchInterval: enabled ? 4000 : false,
  });

  // Refresh the cached channel list only when the status actually CHANGES —
  // invalidating inside the queryFn fired on every 4s poll.
  const status = query.data?.status;
  useEffect(() => {
    if (!status) return;
    if (prevStatusRef.current !== null && prevStatusRef.current !== status) {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    }
    prevStatusRef.current = status;
  }, [status, organization?.id, queryClient]);

  return query;
}
