-- Command queue for email actions/sending. The CRM inserts a command; the email
-- gateway (already connected to Postgres) polls, executes it over IMAP/SMTP and
-- updates status + the email tables. This keeps the gateway outbound-only — no
-- public HTTP exposure needed.
CREATE TABLE IF NOT EXISTS public.email_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  -- mark_read | mark_unread | flag | unflag | move | delete | spam | archive | send
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  -- pending | processing | done | error
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_email_commands_pending ON public.email_commands(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_commands_channel ON public.email_commands(channel_id);

ALTER TABLE public.email_commands ENABLE ROW LEVEL SECURITY;

-- Org members can queue commands and watch their status. The gateway uses the
-- service role / direct connection (bypasses RLS) to claim and complete them.
DROP POLICY IF EXISTS email_commands_insert ON public.email_commands;
CREATE POLICY email_commands_insert ON public.email_commands
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS email_commands_select ON public.email_commands;
CREATE POLICY email_commands_select ON public.email_commands
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.email_commands;
