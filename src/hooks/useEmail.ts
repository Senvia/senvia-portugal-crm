import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// The email_* tables are newer than the generated Supabase types, so we access
// them through an untyped handle and apply our own result interfaces.
const db = supabase as unknown as {
  from: (t: string) => any;
};

export type EmailFolderRole = 'inbox' | 'sent' | 'drafts' | 'junk' | 'trash' | 'archive' | 'custom';

export interface EmailFolder {
  id: string;
  channel_id: string;
  path: string;
  name: string;
  role: EmailFolderRole;
  unread_count: number;
  total_count: number;
  sort: number;
}

export interface EmailAddress { name: string; address: string; }

export interface EmailMessage {
  id: string;
  channel_id: string;
  folder_id: string;
  uid: number;
  message_id: string | null;
  thread_id: string | null;
  in_reply_to: string | null;
  from_name: string | null;
  from_address: string | null;
  to_addresses: EmailAddress[];
  cc_addresses: EmailAddress[];
  subject: string | null;
  snippet: string | null;
  date: string | null;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  has_attachments: boolean;
  body_fetched: boolean;
  html_body: string | null;
  text_body: string | null;
}

export interface EmailAttachment {
  id: string;
  message_id: string;
  filename: string | null;
  content_type: string | null;
  size: number | null;
  inline: boolean;
  content_id: string | null;
  storage_path: string | null;
}

// Folders of an email caixa, ordered for the rail (system folders first).
export function useEmailFolders(channelId: string | null) {
  return useQuery({
    queryKey: ['email-folders', channelId],
    queryFn: async (): Promise<EmailFolder[]> => {
      if (!channelId) return [];
      const { data, error } = await db
        .from('email_folders')
        .select('id, channel_id, path, name, role, unread_count, total_count, sort')
        .eq('channel_id', channelId)
        .order('sort', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as EmailFolder[];
    },
    enabled: !!channelId,
  });
}

// Message headers of a folder (no bodies — keeps the list light).
export function useEmailMessages(folderId: string | null) {
  return useQuery({
    queryKey: ['email-messages', folderId],
    queryFn: async (): Promise<EmailMessage[]> => {
      if (!folderId) return [];
      const { data, error } = await db
        .from('email_messages')
        .select('id, channel_id, folder_id, uid, from_name, from_address, to_addresses, cc_addresses, subject, snippet, date, seen, flagged, answered, has_attachments')
        .eq('folder_id', folderId)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as EmailMessage[];
    },
    enabled: !!folderId,
  });
}

// Live updates: when the gateway syncs new mail / flag changes (IDLE), refresh
// the folder counts and message lists for this caixa without a manual reload.
export function useEmailRealtime(channelId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`email-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages', filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ['email-messages'] });
        qc.invalidateQueries({ queryKey: ['email-folders', channelId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_folders', filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ['email-folders', channelId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, qc]);
}

// Search across the whole caixa (all folders) by subject / sender / snippet.
export function useEmailSearch(channelId: string | null, query: string) {
  const term = query.trim().replace(/[,()%]/g, ' ');
  return useQuery({
    queryKey: ['email-search', channelId, term],
    queryFn: async (): Promise<EmailMessage[]> => {
      if (!channelId || term.length < 2) return [];
      const like = `%${term}%`;
      const { data, error } = await db
        .from('email_messages')
        .select('id, channel_id, folder_id, from_name, from_address, to_addresses, cc_addresses, subject, snippet, date, seen, flagged, answered, has_attachments')
        .eq('channel_id', channelId)
        .or(`subject.ilike.${like},from_name.ilike.${like},from_address.ilike.${like},snippet.ilike.${like}`)
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmailMessage[];
    },
    enabled: !!channelId && term.length >= 2,
  });
}

// One full message (with body) + its attachments, for the reader pane.
export function useEmailMessage(messageId: string | null) {
  return useQuery({
    queryKey: ['email-message', messageId],
    queryFn: async (): Promise<{ message: EmailMessage; attachments: EmailAttachment[] } | null> => {
      if (!messageId) return null;
      const { data: message, error } = await db
        .from('email_messages').select('*').eq('id', messageId).single();
      if (error) throw error;
      const { data: attachments } = await db
        .from('email_attachments').select('*').eq('message_id', messageId);
      return { message: message as EmailMessage, attachments: (attachments || []) as EmailAttachment[] };
    },
    enabled: !!messageId,
  });
}
