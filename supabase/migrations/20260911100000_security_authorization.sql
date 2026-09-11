-- A01/A03/A08/A10/A11. Apply before deploying the matching Edge Functions.
BEGIN;

CREATE OR REPLACE FUNCTION public.meets_mfa_policy(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' THEN true
    WHEN nullif(current_setting('request.jwt.claims', true), '') IS NULL
      AND session_user IN ('postgres', 'supabase_admin') THEN true
    WHEN _user_id IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN false
    WHEN auth.jwt()->>'aal' = 'aal2' THEN true
    ELSE NOT (
      EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = _user_id AND status = 'verified')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        LEFT JOIN public.organization_profiles op
          ON op.id = om.profile_id AND op.organization_id = om.organization_id
        WHERE om.user_id = _user_id AND om.is_active
          AND (om.role = 'admin' OR op.base_role = 'admin')
      )
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.meets_mfa_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meets_mfa_policy(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.meets_mfa_policy(_user_id) AND (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      LEFT JOIN public.organization_profiles op
        ON op.id = om.profile_id AND op.organization_id = om.organization_id
      WHERE om.user_id = _user_id AND om.organization_id = _org_id AND om.is_active
        AND (om.role = 'admin' OR op.base_role = 'admin')
    ) OR public.has_role(_user_id, 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE active_org uuid;
BEGIN
  BEGIN
    active_org := COALESCE(
      (auth.jwt()->'app_metadata'->>'active_organization_id')::uuid,
      (auth.jwt()->'user_metadata'->>'active_organization_id')::uuid
    );
  EXCEPTION WHEN invalid_text_representation THEN active_org := NULL;
  END;
  IF active_org IS NOT NULL AND (
    public.is_org_member(_user_id, active_org) OR public.has_role(_user_id, 'super_admin')
  ) THEN RETURN active_org; END IF;
  SELECT organization_id INTO active_org FROM public.organization_members
    WHERE user_id = _user_id AND is_active ORDER BY joined_at, organization_id LIMIT 1;
  RETURN active_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.pode_aceder_caixa(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.meets_mfa_policy(_user_id) AND EXISTS (
    SELECT 1 FROM public.messaging_channels c
    WHERE c.id = _channel_id AND public.is_org_member(_user_id, c.organization_id)
      AND (c.assigned_user_ids IS NULL OR cardinality(c.assigned_user_ids) = 0
        OR _user_id = ANY(c.assigned_user_ids)
        OR public.is_org_admin(_user_id, c.organization_id))
  );
$$;

-- Internal search functions are called only by Edge service clients.
REVOKE ALL ON FUNCTION public.search_clients_unaccent(uuid,text,integer),
 public.search_leads_unaccent(uuid,text,text,integer),
 public.search_invoices_unaccent(uuid,text,text,integer),
 public.search_sales_unaccent(uuid,text,text,integer),
 public.search_proposals_unaccent(uuid,text,text,integer),
 public.search_credit_notes_unaccent(uuid,text,text,integer),
 public.generate_sale_commission_splits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_clients_unaccent(uuid,text,integer),
 public.search_leads_unaccent(uuid,text,text,integer),
 public.search_invoices_unaccent(uuid,text,text,integer),
 public.search_sales_unaccent(uuid,text,text,integer),
 public.search_proposals_unaccent(uuid,text,text,integer),
 public.search_credit_notes_unaccent(uuid,text,text,integer),
 public.generate_sale_commission_splits(uuid) TO service_role;

-- This directory is used by the inter-organization sale selector. It exposes
-- only public business identity; require a current caller organization.
CREATE OR REPLACE FUNCTION public.search_organizations_by_name(
  _caller_org_id uuid, _search text, _limit integer DEFAULT 10
) RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.slug FROM public.organizations o
  WHERE public.is_org_member(auth.uid(), _caller_org_id)
    AND public.meets_mfa_policy(auth.uid())
    AND o.id <> _caller_org_id AND length(trim(_search)) >= 2
    AND immutable_unaccent(lower(o.name)) LIKE '%' || immutable_unaccent(lower(_search)) || '%'
  ORDER BY o.name, o.id LIMIT greatest(1, least(coalesce(_limit, 10), 25));
$$;
REVOKE ALL ON FUNCTION public.search_organizations_by_name(uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_organizations_by_name(uuid,text,integer) TO authenticated;

COMMIT;
