-- STEP 8 — Cron jobs (pg_cron lives in the `cron` schema, NOT migrated by the
-- public-schema dump). You must recreate them on the NEW project.

-- ===== PART A: run on the OLD project. =====
-- Generates ready-to-run cron.schedule() calls with the URL + anon key already
-- swapped to placeholders. Copy the output, replace <NEW_REF> and <NEW_ANON>,
-- then run it on the NEW project.
select format(
  'select cron.schedule(%L, %L, %L);',
  jobname,
  schedule,
  replace(
    replace(command, 'zppcobirzgpfcrnxznwe', '<NEW_REF>'),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGNvYmlyemdwZmNybnh6bndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDIxNDEsImV4cCI6MjA4MzM3ODE0MX0.wn6rMm8gOMJMgnB0jBStpcj5WlybmvauH_th3dcYTuw',
    '<NEW_ANON>'
  )
) as recreate_on_new
from cron.job
order by jobid;

-- ===== PART B: run on the NEW project. =====
-- Paste PART A's output, replace <NEW_REF> + <NEW_ANON>, run.
-- (This includes the reconcile-plans-daily job we created.)
