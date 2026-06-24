-- Fix the system-admin "Última atividade" so it reflects real usage.
--
-- Two problems with 20260622120000_org_activity_signal.sql, for the ADMIN view:
--  1. last_active_at was seeded from the EARLIEST entity (first_*_at = MIN
--     created_at), so it showed the org's birth date, not its last action. An
--     org created in January with a lead created last week still showed January.
--  2. The triggers only stamp on INSERT of lead/client/sale/proposal, so an org
--     that IS used (logins, admin work, editing) but doesn't create new entities
--     looks dead. That is correct for the ACTIVATION funnel (crons/nudges), but
--     wrong for the admin "is this account being used?" column.
--
-- Fix 1 (here): re-seed last_active_at FORWARD to the latest real creation
--     (GREATEST, never backwards) — corrects the MIN-based seed. Keeps the
--     activation signal creation-only, so the funnel/crons stay correct.
-- Fix 2 (here + frontend): admin_org_last_sign_in() exposes the latest member
--     login per org (super-admin only); the system-admin folds it into the
--     displayed activity = GREATEST(last_active_at, last login).

-- Fix 1: re-seed forward to the latest real creation across the 4 entities.
UPDATE public.organizations o
SET last_active_at = GREATEST(
  COALESCE(o.last_active_at, 'epoch'::timestamptz),
  sub.max_at
)
FROM (
  SELECT organization_id, max(created_at) AS max_at FROM (
    SELECT organization_id, created_at FROM public.leads
    UNION ALL SELECT organization_id, created_at FROM public.crm_clients
    UNION ALL SELECT organization_id, created_at FROM public.sales
    UNION ALL SELECT organization_id, created_at FROM public.proposals
  ) all_ents
  WHERE organization_id IS NOT NULL
  GROUP BY organization_id
) sub
WHERE o.id = sub.organization_id;

-- Fix 2: latest member login per org. SECURITY DEFINER so it can read
-- auth.users; gated to super_admin so it never leaks login data.
CREATE OR REPLACE FUNCTION public.admin_org_last_sign_in()
RETURNS TABLE(org_id uuid, last_login timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'forbidden: super_admin only';
  END IF;

  RETURN QUERY
  SELECT om.organization_id, max(u.last_sign_in_at)
  FROM public.organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.is_active
  GROUP BY om.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_org_last_sign_in() TO authenticated;
