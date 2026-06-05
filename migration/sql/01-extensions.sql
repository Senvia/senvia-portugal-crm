-- STEP 1 — run on the NEW project (SQL Editor) BEFORE restoring the schema.
-- Enables the extensions the schema/functions depend on.

create extension if not exists "uuid-ossp"  with schema extensions;
create extension if not exists pgcrypto     with schema extensions;
create extension if not exists unaccent     with schema extensions;
create extension if not exists pg_net       with schema extensions;
create extension if not exists pg_cron;          -- lives in the cron schema
create extension if not exists vault;            -- only if you use Supabase Vault

-- Sanity check
select extname from pg_extension order by extname;
