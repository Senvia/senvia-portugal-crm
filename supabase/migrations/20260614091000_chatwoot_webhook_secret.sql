-- SECURITY #2 — authenticate the chatwoot-webhook.
--
-- chatwoot-webhook runs with verify_jwt = false and resolved the org only from
-- event.account.id (an enumerable integer). An attacker could forge POSTs to
-- fire push notifications, burn the Gemini quota and — worst — trigger the
-- out-of-hours auto-reply to an arbitrary phone number (destination + the
-- anti-repeat guard both came from the attacker's payload).
--
-- Fix: a per-org secret is appended to the registered webhook URL (?key=...).
-- chatwoot-webhook now requires the key to match the org resolved by account.id.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS chatwoot_webhook_secret TEXT;

-- Backfill a secret for every org so the webhook can be re-registered with the
-- key on the next inbox open. (Two UUIDs = 64 hex chars; gen_random_uuid is in
-- core Postgres, so no pgcrypto schema-qualification concerns.)
UPDATE public.organizations
  SET chatwoot_webhook_secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE chatwoot_webhook_secret IS NULL;
