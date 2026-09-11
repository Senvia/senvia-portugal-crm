-- Grace period requested for CRM users. MFA remains optional through
-- 20 September 2026 in Lisbon and becomes mandatory at local midnight.
BEGIN;

CREATE OR REPLACE FUNCTION public.mfa_policy_allows(_user_id uuid, _at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' THEN true
    WHEN nullif(current_setting('request.jwt.claims', true), '') IS NULL
      AND session_user IN ('postgres', 'supabase_admin') THEN true
    WHEN _user_id IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN false
    WHEN _at < timestamptz '2026-09-21 00:00:00 Europe/Lisbon' THEN true
    ELSE auth.jwt()->>'aal' = 'aal2'
  END;
$$;

REVOKE ALL ON FUNCTION public.mfa_policy_allows(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.meets_mfa_policy(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mfa_policy_allows(_user_id, now());
$$;

REVOKE ALL ON FUNCTION public.meets_mfa_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meets_mfa_policy(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
