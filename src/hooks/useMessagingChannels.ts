import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MessagingChannel {
  id: string;
  organization_id: string;
  channel_type: string;
  provider: string;
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
  instance?: string;
  account_id?: number;
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

// Provision + fetch the QR code to connect WhatsApp.
export function useWhatsappConnect() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ConnectResponse> => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { organization_id: organization.id },
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

// Poll the WhatsApp connection status. Enable while the QR modal is open.
export function useWhatsappStatus(enabled: boolean) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['whatsapp-status', organization?.id],
    queryFn: async (): Promise<StatusResponse> => {
      if (!organization?.id) return { status: 'disconnected', phone_number: null };
      const { data, error } = await supabase.functions.invoke('whatsapp-status', {
        body: { organization_id: organization.id },
      });
      if (error) throw error;
      const result = data as StatusResponse;
      // Keep the cached channel list fresh when the status changes.
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
      return result;
    },
    enabled: enabled && !!organization?.id,
    refetchInterval: enabled ? 4000 : false,
  });
}
