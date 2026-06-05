-- STEP 7 — run on the NEW project AFTER schema restore.
-- Rewrites every DB function whose body still points at the OLD project's URL
-- and anon key (e.g. notify_automation_trigger, create_organization_for_current_user).
-- These call net.http_post with a hard-coded URL + Bearer key.
--
-- >>> EDIT the two PUT_* lines below, then run the whole file. <<<

select set_config('migr.old_ref',  'zppcobirzgpfcrnxznwe', false);
select set_config('migr.new_ref',  'PUT_NEW_REF_HERE', false);
select set_config('migr.old_anon', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGNvYmlyemdwZmNybnh6bndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDIxNDEsImV4cCI6MjA4MzM3ODE0MX0.wn6rMm8gOMJMgnB0jBStpcj5WlybmvauH_th3dcYTuw', false);
select set_config('migr.new_anon', 'PUT_NEW_ANON_KEY_HERE', false);

DO $$
DECLARE
  r record;
  newdef text;
  cnt int := 0;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosrc LIKE '%' || current_setting('migr.old_ref') || '%'
  LOOP
    newdef := pg_get_functiondef(r.oid);
    newdef := replace(newdef, current_setting('migr.old_ref'),  current_setting('migr.new_ref'));
    newdef := replace(newdef, current_setting('migr.old_anon'), current_setting('migr.new_anon'));
    EXECUTE newdef;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Patched % function(s).', cnt;
END $$;

-- Verify nothing still references the old ref:
select n.nspname || '.' || p.proname as still_referencing_old_ref
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosrc like '%zppcobirzgpfcrnxznwe%';
