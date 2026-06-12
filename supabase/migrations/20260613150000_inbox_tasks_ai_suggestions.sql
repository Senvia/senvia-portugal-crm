-- AI task suggestions (fase 2): the chatwoot-webhook runs a Gemini classifier
-- over conversation messages and inserts SUGGESTED tasks (suggested = true).
-- They only become real tasks (reminders armed, badges counted) when a user
-- accepts them in the inbox panel. created_by becomes nullable: null = AI.
ALTER TABLE public.inbox_tasks
  ADD COLUMN suggested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN source_message TEXT,
  ALTER COLUMN created_by DROP NOT NULL;

-- Suggestion dedupe/cap lookups by contact.
CREATE INDEX idx_inbox_tasks_suggested
  ON public.inbox_tasks (organization_id, contact_phone)
  WHERE suggested = true AND done_at IS NULL;
