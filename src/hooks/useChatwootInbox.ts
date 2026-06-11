import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InboxConversation {
  id: number;
  contact_name: string;
  contact_phone: string | null;
  contact_thumbnail: string | null;
  last_message: string | null;
  unread_count: number;
  status: string;
  channel: string | null;
  updated_at: number | null;
}

export interface InboxMessage {
  id: number;
  content: string;
  outgoing: boolean;
  is_activity: boolean;
  created_at: string | number | null;
  sender_name: string | null;
  attachments: Array<{ data_url?: string; file_type?: string }>;
}

async function invokeInbox<T>(organizationId: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
    body: { organization_id: organizationId, ...payload },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

// List the open conversations for the org's Chatwoot account (polled).
export function useInboxConversations(enabled = true) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['inbox-conversations', organization?.id],
    queryFn: async (): Promise<InboxConversation[]> => {
      if (!organization?.id) return [];
      const res = await invokeInbox<{ conversations: InboxConversation[] }>(organization.id, {
        action: 'list_conversations',
      });
      return res.conversations || [];
    },
    enabled: enabled && !!organization?.id,
    refetchInterval: enabled ? 8000 : false,
  });
}

// Messages of a conversation (polled while one is open).
export function useInboxMessages(conversationId: number | null) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['inbox-messages', organization?.id, conversationId],
    queryFn: async (): Promise<InboxMessage[]> => {
      if (!organization?.id || !conversationId) return [];
      const res = await invokeInbox<{ messages: InboxMessage[] }>(organization.id, {
        action: 'get_messages',
        conversation_id: conversationId,
      });
      return res.messages || [];
    },
    enabled: !!organization?.id && !!conversationId,
    refetchInterval: conversationId ? 5000 : false,
  });
}

// Mark a conversation as read (clears the unread badge in Chatwoot).
export function useMarkConversationRead() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      if (!organization?.id) return;
      await invokeInbox(organization.id, { action: 'mark_read', conversation_id: conversationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

// Send a reply on a conversation.
export function useSendInboxMessage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox<{ message: InboxMessage }>(organization.id, {
        action: 'send_message',
        conversation_id: conversationId,
        content,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', organization?.id, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}
