-- Schedule the WhatsApp keepalive heartbeat every 2 minutes via pg_cron.
-- Checks all WhatsApp Evolution instances and reconnects any that dropped.
-- Must be deployed as edge function 'whatsapp-keepalive' with verify_jwt=false.
SELECT cron.schedule(
  'whatsapp-keepalive',
  '*/2 * * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/whatsapp-keepalive',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'supabase_service_role_key'
            LIMIT 1
          )
        )
      ) AS request_id;
  $$
);
