-- Scheduled WhatsApp messages: written now, sent later by the
-- send-scheduled-messages edge function (pg_cron, every minute).
CREATE TABLE public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed | cancelled
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_messages_due
  ON public.scheduled_messages (send_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_messages_org
  ON public.scheduled_messages (organization_id);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view scheduled messages"
  ON public.scheduled_messages FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create scheduled messages"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "Org members can update scheduled messages"
  ON public.scheduled_messages FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete scheduled messages"
  ON public.scheduled_messages FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));
