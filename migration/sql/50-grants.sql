-- STEP 5 — run on the NEW project AFTER schema + data restore.
-- dump-restore.sh preserves object and column ACLs. Do not recreate broad
-- client grants: doing so exposes secret columns and internal definer RPCs.

grant usage on schema public to anon, authenticated, service_role;

-- Service privileges are intentionally independent of browser privileges.
grant all on all tables in schema public to service_role;
grant all on all routines in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on routines from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.organizations', 'SELECT')
    OR has_table_privilege('anon', 'public.organizations', 'SELECT')
    OR has_table_privilege('authenticated', 'public.messaging_channels', 'SELECT') THEN
    RAISE EXCEPTION 'Unsafe restored column ACLs: apply security migrations before exposing API';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'internal_service_key', 'automation_internal_secret', 'get_vault_secret',
      'generate_sale_commission_splits', 'search_clients_unaccent', 'search_leads_unaccent',
      'search_invoices_unaccent', 'search_sales_unaccent', 'search_proposals_unaccent',
      'search_credit_notes_unaccent')
    AND (has_function_privilege('authenticated', p.oid, 'EXECUTE')
      OR has_function_privilege('anon', p.oid, 'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'Unsafe restored RPC ACLs: apply security migrations before exposing API';
  END IF;
END;
$$;
