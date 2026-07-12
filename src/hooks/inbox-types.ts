export interface InboxConversation {
  id: number;
  alt_ids: number[];
  contact_id: number | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_identifier: string | null;
  contact_thumbnail: string | null;
  last_message: string | null;
  last_outgoing: boolean;
  last_status: string | null;
  email_subject: string | null;
  unread_count: number;
  status: string;
  channel: string | null;
  inbox_id: number | null;
  updated_at: number | null;
  waiting_since: number | null;
  labels: string[];
  assigned_id: string | null;
  assigned_name: string | null;
  crm_kind: 'lead' | 'client' | null;
  crm_id: string | null;
  crm_name: string | null;
}

export interface InboxAttachment {
  id?: number;
  file_type: string;
  data_url: string | null;
  thumb_url: string | null;
  file_size: number | null;
  extension: string | null;
}

export interface InboxMessage {
  id: number;
  content: string;
  outgoing: boolean;
  is_activity: boolean;
  is_private?: boolean;
  created_at: string | number | null;
  sender_name: string | null;
  status: string | null;
  wa_id: string | null;
  reply_to_id?: number | null;
  attachments: InboxAttachment[];
  content_type: string | null;
  email_from: string | null;
  email_to: string | null;
  email_cc: string | null;
  email_subject: string | null;
  email_html_body: string | null;
}

export interface OutgoingAttachment {
  data: string;
  mimetype: string;
  filename: string;
  kind: 'image' | 'video' | 'document' | 'voice';
}

export interface PresencePeer {
  userId: string;
  name: string;
  color: string;
  typing: boolean;
  lastSeen: number;
  conversationId: number | null;
}

export interface SendMessageVars {
  conversationId: number;
  content: string;
  contactPhone?: string | null;
  inboxId?: number | null;
  attachment?: OutgoingAttachment;
  quotedId?: string | null;
}

export interface ContactMatch {
  kind: 'lead' | 'client';
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface InboxLabel {
  id: number;
  title: string;
  color: string | null;
}

export interface CannedResponse {
  id: number;
  content: string;
}

export interface AutoReplyConfig {
  enabled: boolean;
  start: string;
  end: string;
  message: string;
}

export interface ScheduledMessage {
  id: string;
  phone: string;
  content: string;
  send_at: string;
  status: string;
  attachment_name: string | null;
}

export interface CrmRecordDetail {
  kind: 'lead' | 'client';
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  value: number | null;
  notes: string | null;
}
