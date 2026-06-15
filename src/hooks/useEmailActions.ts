import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmailMessage, EmailAddress } from './useEmail';

const db = supabase as unknown as { from: (t: string) => any };

export interface SendAttachment { filename: string; contentType: string; b64: string; }
export interface SendPayload {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string | null;
  references?: string[];
  attachments?: SendAttachment[];
}

// Queue email actions/sends as commands; the gateway executes them over IMAP/SMTP.
// Optimistic cache updates give an instant feel; Realtime reconciles within ~3s.
export function useEmailActions(channelId: string | null, folderId: string | null) {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const orgId = organization?.id;

  const queue = async (type: string, payload: Record<string, unknown>) => {
    if (!orgId || !channelId) throw new Error('Caixa não selecionada');
    const { error } = await db.from('email_commands').insert({
      organization_id: orgId, channel_id: channelId, type, payload,
    });
    if (error) throw error;
  };

  const patchList = (messageId: string, patch: Partial<EmailMessage>) => {
    qc.setQueryData(['email-messages', folderId], (old: EmailMessage[] | undefined) =>
      Array.isArray(old) ? old.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) : old);
  };
  const removeFromList = (messageId: string) => {
    qc.setQueryData(['email-messages', folderId], (old: EmailMessage[] | undefined) =>
      Array.isArray(old) ? old.filter((m) => m.id !== messageId) : old);
  };

  return {
    setRead: (id: string, read: boolean) => { patchList(id, { seen: read }); return queue(read ? 'mark_read' : 'mark_unread', { messageId: id }); },
    setFlag: (id: string, on: boolean) => { patchList(id, { flagged: on }); return queue(on ? 'flag' : 'unflag', { messageId: id }); },
    archive: (id: string) => { removeFromList(id); return queue('archive', { messageId: id }); },
    spam: (id: string) => { removeFromList(id); return queue('spam', { messageId: id }); },
    trash: (id: string) => { removeFromList(id); return queue('delete', { messageId: id }); },
    move: (id: string, targetFolderId: string) => { removeFromList(id); return queue('move', { messageId: id, targetFolderId }); },
    fetchAttachment: (attachmentId: string) => queue('fetch_attachment', { attachmentId }),
    send: (payload: SendPayload) => queue('send', payload as unknown as Record<string, unknown>),
  };
}
