-- Schedule enqueue_trial_whatsapp_nudges() every hour via pg_cron.
-- The function itself enforces threshold/cooldown/max_count, so running
-- hourly is safe — it only sends when conditions are met.

SELECT cron.schedule(
  'trial-whatsapp-nudges',
  '0 * * * *',  -- every hour on the hour
  $$
    SELECT public.enqueue_trial_whatsapp_nudges();
  $$
);
