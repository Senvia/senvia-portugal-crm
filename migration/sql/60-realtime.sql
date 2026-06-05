-- STEP 6 — Realtime publication.
-- pg_dump --schema=public does NOT carry the supabase_realtime publication, so
-- you must re-add the tables on the NEW project.

-- ===== PART A: run on the OLD project. =====
-- It prints ready-to-run ALTER PUBLICATION statements.
select coalesce(
  string_agg(format('alter publication supabase_realtime add table %I.%I;', schemaname, tablename), E'\n'),
  '-- (no realtime tables)'
) as run_this_on_new
from pg_publication_tables
where pubname = 'supabase_realtime';

-- ===== PART B: run on the NEW project. =====
-- Paste the output of PART A here and run it. Example:
-- alter publication supabase_realtime add table public.leads;
-- alter publication supabase_realtime add table public.notifications;
