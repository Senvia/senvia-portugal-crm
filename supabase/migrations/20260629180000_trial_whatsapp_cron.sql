-- Schedule enqueue_trial_whatsapp_nudges() every hour via pg_cron.
-- A funcao ja foi criada em 20260622130000_trial_whatsapp_nudges.sql
-- Esta migration apenas regista o cron job que a invoca periodicamente.
-- Como a funcao ja tem os seus proprios limites (cooldown 2 dias, max 4 nudges,
-- threshold 1 dia de inatividade), e seguro correr de hora a hora.

SELECT cron.schedule(
  'trial-whatsapp-nudges',
  '0 * * * *',
  $$
    SELECT public.enqueue_trial_whatsapp_nudges();
  $$
);
