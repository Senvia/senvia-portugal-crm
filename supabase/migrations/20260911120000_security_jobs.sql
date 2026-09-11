BEGIN;

CREATE OR REPLACE FUNCTION public.claim_automation_queue(p_limit integer DEFAULT 50)
RETURNS SETOF public.automation_queue
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH claimed AS (
    SELECT id FROM public.automation_queue
    WHERE status = 'pending' AND scheduled_for <= now()
    ORDER BY scheduled_for, id
    LIMIT greatest(1, least(p_limit, 50))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.automation_queue q SET status = 'processing'
  FROM claimed WHERE q.id = claimed.id RETURNING q.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_automation_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_queue(integer) TO service_role;
COMMENT ON FUNCTION public.claim_automation_queue(integer) IS
  'Claims at most 50 due items once. Processing/failed items require delivery reconciliation before manual retry; never automatically requeue ambiguous deliveries.';

-- Preserve existing schedules, replacing only calls to the audited internal jobs.
-- Secrets remain in Vault and are resolved on every invocation.
DO $$
DECLARE job record; target_url text;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;
  FOR job IN SELECT jobid, command FROM cron.job LOOP
    target_url := substring(job.command FROM '(https://[a-zA-Z0-9.-]+/functions/v1/(?:check-reminders|process-automation-queue|notify-new-trials|check-trial-status|check-fidelization-alerts|generate-recurring-expenses|check-renewal-automations|process-scheduled-campaigns|trial-inactivity-check|task-reminders))');
    IF target_url IS NOT NULL THEN
      PERFORM cron.alter_job(job.jobid, command := format(
        'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''x-automation-secret'', public.automation_internal_secret()), body := ''{}''::jsonb);',
        target_url));
    END IF;
  END LOOP;
END;
$$;

COMMIT;
