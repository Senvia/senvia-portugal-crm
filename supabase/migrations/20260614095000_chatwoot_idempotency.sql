-- BUG #17 — webhook idempotency.
--
-- Chatwoot retries failed/slow webhook deliveries, so the same message_created
-- event can arrive several times, producing duplicate push notifications and
-- duplicate Gemini task suggestions. Track processed message ids and skip
-- repeats. Written by chatwoot-webhook with the service role only.
CREATE TABLE IF NOT EXISTS public.chatwoot_processed_messages (
  account_id INTEGER NOT NULL,
  message_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, message_id)
);

-- Housekeeping index for the periodic purge below.
CREATE INDEX IF NOT EXISTS idx_chatwoot_processed_messages_created_at
  ON public.chatwoot_processed_messages (created_at);

ALTER TABLE public.chatwoot_processed_messages ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) touches this table.

-- Keep it small: drop the dedupe window after 2 days (retries happen within
-- minutes). Safe to run from the same cron that already sweeps reminders.
CREATE OR REPLACE FUNCTION public.purge_chatwoot_processed_messages()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.chatwoot_processed_messages WHERE created_at < now() - interval '2 days';
$$;
