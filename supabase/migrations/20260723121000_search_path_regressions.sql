-- 20260723121000_search_path_regressions.sql
-- Security audit fix (Vector 3 - SECURITY DEFINER hardening): these two
-- functions had SET search_path applied by 20260619120000_security_hardening.sql,
-- but a later CREATE OR REPLACE (20260624150000_forms_assignment_and_default_hardening.sql)
-- silently dropped it — CREATE OR REPLACE discards any config previously
-- attached via ALTER FUNCTION unless the new CREATE re-declares it. Re-pinning.
ALTER FUNCTION public.get_next_form_assignee(uuid) SET search_path = public;
ALTER FUNCTION public.get_next_webhook_assignee(uuid) SET search_path = public;

-- unarchive_lead_on_whatsapp_nudge() never had search_path pinned at all.
-- Not caller-input-driven (fires from a trial-nudge insert, not raw user
-- text), so this is defense-in-depth rather than a live exploit path, but it
-- should follow the same SECURITY DEFINER convention as every other function
-- in this codebase.
CREATE OR REPLACE FUNCTION unarchive_lead_on_whatsapp_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET archived_at = NULL
  WHERE phone = NEW.phone
    AND archived_at IS NOT NULL;
  RETURN NEW;
END;
$$;
