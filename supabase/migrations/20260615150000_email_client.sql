-- Email client subsystem (caixas de email).
-- Mirrors IMAP folders/messages into Postgres so the CRM can offer a full email
-- client (Entrada/Enviados/Rascunhos/Spam/Lixo/Arquivo + custom). The email
-- gateway (Node + ImapFlow) writes here with the service role; the frontend
-- reads via RLS + Realtime. Messaging caixas (WhatsApp/IG/Messenger) are
-- unaffected — they stay on Chatwoot.
--
-- A "caixa de email" is the existing messaging_channels row (channel_type='email').

-- ── Folders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  path text NOT NULL,                       -- raw IMAP mailbox path, e.g. "INBOX", "INBOX.Sent"
  name text NOT NULL,                       -- display name, e.g. "Enviados"
  role text NOT NULL DEFAULT 'custom',      -- inbox|sent|drafts|junk|trash|archive|custom
  special_use text,                         -- raw \Sent \Drafts \Junk \Trash \Archive
  parent_path text,
  unread_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  uidvalidity bigint,                       -- IMAP UIDVALIDITY (resync trigger if it changes)
  uidnext bigint,
  subscribed boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 100,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, path)
);
CREATE INDEX IF NOT EXISTS idx_email_folders_channel ON public.email_folders(channel_id);
CREATE INDEX IF NOT EXISTS idx_email_folders_org ON public.email_folders(organization_id);

-- ── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.email_folders(id) ON DELETE CASCADE,
  uid bigint NOT NULL,                      -- IMAP UID within the folder
  message_id text,                          -- RFC822 Message-ID header
  thread_id text,                           -- computed thread key (root message-id / normalized subject)
  in_reply_to text,
  email_references text[],
  from_name text,
  from_address text,
  to_addresses jsonb NOT NULL DEFAULT '[]', -- [{name, address}]
  cc_addresses jsonb NOT NULL DEFAULT '[]',
  bcc_addresses jsonb NOT NULL DEFAULT '[]',
  reply_to jsonb,
  subject text,
  snippet text,                             -- first ~200 chars of text body
  date timestamptz,
  seen boolean NOT NULL DEFAULT false,
  flagged boolean NOT NULL DEFAULT false,
  answered boolean NOT NULL DEFAULT false,
  draft boolean NOT NULL DEFAULT false,
  has_attachments boolean NOT NULL DEFAULT false,
  size integer,
  body_fetched boolean NOT NULL DEFAULT false, -- lazy: headers sync first, body on open
  html_body text,
  text_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, folder_id, uid)
);
CREATE INDEX IF NOT EXISTS idx_email_messages_folder_date ON public.email_messages(folder_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON public.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_org ON public.email_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_channel_unseen ON public.email_messages(channel_id) WHERE seen = false;

-- ── Attachments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  part_id text,                             -- IMAP body part id (fetch on demand)
  filename text,
  content_type text,
  size integer,
  inline boolean NOT NULL DEFAULT false,
  content_id text,                          -- for cid: inline images
  storage_path text,                        -- Supabase Storage path once downloaded (null = not yet)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON public.email_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_org ON public.email_attachments(organization_id);

-- ── Drafts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  author_id uuid,                           -- profile that owns the draft
  to_addresses jsonb NOT NULL DEFAULT '[]',
  cc_addresses jsonb NOT NULL DEFAULT '[]',
  bcc_addresses jsonb NOT NULL DEFAULT '[]',
  subject text,
  body_html text,
  in_reply_to text,                         -- message_id header we're replying to
  reply_message_id uuid REFERENCES public.email_messages(id) ON DELETE SET NULL,
  attachments jsonb NOT NULL DEFAULT '[]',
  imap_uid bigint,                          -- uid in the IMAP Drafts folder once synced
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_drafts_channel ON public.email_drafts(channel_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_org ON public.email_drafts(organization_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Org members can READ everything for their org. Writes to folders/messages/
-- attachments happen ONLY via the gateway (service role, bypasses RLS). Drafts
-- are user data, so org members get full CRUD on them.
ALTER TABLE public.email_folders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drafts      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_folders_select ON public.email_folders;
CREATE POLICY email_folders_select ON public.email_folders
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS email_messages_select ON public.email_messages;
CREATE POLICY email_messages_select ON public.email_messages
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS email_attachments_select ON public.email_attachments;
CREATE POLICY email_attachments_select ON public.email_attachments
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS email_drafts_all ON public.email_drafts;
CREATE POLICY email_drafts_all ON public.email_drafts
  FOR ALL USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Frontend gets live updates when the gateway syncs new mail / flag changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_drafts;
