-- Emergency compatibility rollback after the MFA rollout blocked active CRM sessions.
-- Tenant, role, module and record-scope policies remain active. Only the AAL2
-- requirement is suspended until the client completes MFA before loading data.
BEGIN;

CREATE OR REPLACE FUNCTION public.meets_mfa_policy(_user_id uuid)
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
    ELSE _user_id IS NOT NULL AND _user_id = auth.uid()
  END;
$$;

REVOKE ALL ON FUNCTION public.meets_mfa_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meets_mfa_policy(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
