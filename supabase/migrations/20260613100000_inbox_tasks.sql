-- Conversation tasks for the Inbox ("prometi e nao esqueco"): follow-ups tied
-- to a WhatsApp conversation/contact, with due-time push reminders fired by the
-- task-reminders edge function (pg_cron, every minute).
CREATE TABLE public.inbox_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assigned_to UUID,
  -- Conversation context: phone is the stable key (conversations merge/split).
  conversation_id INTEGER,
  contact_phone TEXT,
  contact_name TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Panel + global views: open tasks of an org ordered by due date.
CREATE INDEX idx_inbox_tasks_org_open
  ON public.inbox_tasks (organization_id, due_at)
  WHERE done_at IS NULL;

-- Reminder sweep: due, not done, not yet notified.
CREATE INDEX idx_inbox_tasks_due_reminder
  ON public.inbox_tasks (due_at)
  WHERE done_at IS NULL AND reminder_sent = false AND due_at IS NOT NULL;

-- Conversation panel lookup by contact phone.
CREATE INDEX idx_inbox_tasks_org_phone
  ON public.inbox_tasks (organization_id, contact_phone);

ALTER TABLE public.inbox_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox tasks"
  ON public.inbox_tasks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create inbox tasks"
  ON public.inbox_tasks FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "Org members can update inbox tasks"
  ON public.inbox_tasks FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete inbox tasks"
  ON public.inbox_tasks FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));
