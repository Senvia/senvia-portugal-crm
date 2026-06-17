-- Dedup log for the email vacation auto-reply: we reply to a given sender at most
-- once every few days (like Gmail), so the gateway records each auto-reply here
-- and checks it before sending again. Written only by the email-gateway worker
-- (direct DB connection, bypasses RLS); the browser never reads/writes it.
CREATE TABLE IF NOT EXISTS public.email_vacation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  to_address text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_vacation_log_lookup
  ON public.email_vacation_log (channel_id, lower(to_address), sent_at DESC);

ALTER TABLE public.email_vacation_log ENABLE ROW LEVEL SECURITY;
-- No client policies: only the gateway (service-level DB role) touches this table.
