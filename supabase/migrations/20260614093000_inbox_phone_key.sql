-- BUG #9 / multi-platform #8 — indexed phone_key join key for inbox_tasks and
-- scheduled_messages.
--
-- Conversation tasks, scheduled messages and the AI dedupe all matched contacts
-- with `LIKE '%<last 9 digits>'`, which cannot use an index (leading wildcard)
-- and degrades as the tables grow. contact_notes already solved this with an
-- indexed phone_key (last 9 digits). Mirror that here, kept in sync by a trigger
-- so every writer (app + the service-role webhook) stays consistent.

-- Shared trigger helper: last 9 digits of a phone column into phone_key.
CREATE OR REPLACE FUNCTION public.set_phone_key_from_contact_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_key := right(regexp_replace(coalesce(NEW.contact_phone, ''), '\D', '', 'g'), 9);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_phone_key_from_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_key := right(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), 9);
  RETURN NEW;
END;
$$;

-- inbox_tasks ----------------------------------------------------------------
ALTER TABLE public.inbox_tasks ADD COLUMN IF NOT EXISTS phone_key TEXT;

UPDATE public.inbox_tasks
  SET phone_key = right(regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g'), 9)
  WHERE phone_key IS NULL;

DROP TRIGGER IF EXISTS inbox_tasks_phone_key ON public.inbox_tasks;
CREATE TRIGGER inbox_tasks_phone_key
  BEFORE INSERT OR UPDATE OF contact_phone ON public.inbox_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_phone_key_from_contact_phone();

CREATE INDEX IF NOT EXISTS idx_inbox_tasks_org_phone_key
  ON public.inbox_tasks (organization_id, phone_key);

-- scheduled_messages ---------------------------------------------------------
ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS phone_key TEXT;

UPDATE public.scheduled_messages
  SET phone_key = right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)
  WHERE phone_key IS NULL;

DROP TRIGGER IF EXISTS scheduled_messages_phone_key ON public.scheduled_messages;
CREATE TRIGGER scheduled_messages_phone_key
  BEFORE INSERT OR UPDATE OF phone ON public.scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_phone_key_from_phone();

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org_phone_key
  ON public.scheduled_messages (organization_id, phone_key)
  WHERE status = 'pending';
