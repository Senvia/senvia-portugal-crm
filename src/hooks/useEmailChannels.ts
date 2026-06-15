import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailChannel {
  id: string;
  organization_id: string;
  channel_type: 'email';
  provider: string;
  label: string | null;
  chatwoot_inbox_id: number | null;
  status: string;
  assigned_user_ids: string[];
  rotate_enabled: boolean;
  color: string | null;
  metadata: {
    email_address?: string;
    imap_server?: string;
    imap_port?: number;
    imap_ssl?: boolean;
    imap_login?: string;
    smtp_server?: string;
    smtp_port?: number;
    smtp_ssl?: boolean;
    smtp_login?: string;
    provider_key?: string;
    // imap_password / smtp_password intentionally excluded (stripped below)
  } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmailChannelInput {
  label: string;
  email_config: {
    email_address: string;
    imap_server: string;
    imap_port: number;
    imap_ssl: boolean;
    imap_login: string;
    imap_password: string;
    smtp_server: string;
    smtp_port: number;
    smtp_ssl: boolean;
    smtp_login: string;
    smtp_password: string;
    provider_key?: string;
  };
}

export interface EmailChannelUpdate {
  channel_id: string;
  label?: string;
  email_config?: Partial<Omit<EmailChannelInput['email_config'], 'email_address'>> & {
    email_address?: string;
    imap_password?: string; // optional — keep existing if blank
    smtp_password?: string; // optional — keep existing if blank
  };
}

// Strip passwords from metadata before exposing to components.
// Passwords live in the DB (RLS-protected) but must never reach the browser.
function stripPasswords(ch: Record<string, unknown>): EmailChannel {
  const meta = (ch.metadata as Record<string, unknown> | null) ?? null;
  const cleanMeta = meta
    ? Object.fromEntries(Object.entries(meta).filter(([k]) => !k.endsWith('_password')))
    : null;
  return { ...(ch as unknown as EmailChannel), metadata: cleanMeta as EmailChannel['metadata'] };
}

export function useEmailChannels() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['email-channels', organization?.id],
    queryFn: async (): Promise<EmailChannel[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('messaging_channels')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('channel_type', 'email')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(stripPasswords);
    },
    enabled: !!organization?.id,
  });
}

export function useCreateEmailChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmailChannelInput) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('email-inbox', {
        body: { organization_id: organization.id, action: 'create', ...input },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
      return data as { ok: boolean; channel_id: string; chatwoot_inbox_id: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channels', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

export function useUpdateEmailChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmailChannelUpdate) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('email-inbox', {
        body: { organization_id: organization.id, action: 'update', ...input },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channels', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}

export function useDeleteEmailChannel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase.functions.invoke('email-inbox', {
        body: { organization_id: organization.id, action: 'delete', channel_id: channelId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channels', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}
