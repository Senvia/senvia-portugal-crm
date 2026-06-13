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
        .eq('organization_id', organization.id);
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
