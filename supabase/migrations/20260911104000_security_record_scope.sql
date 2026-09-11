BEGIN;

CREATE FUNCTION public.can_write_owned_record(_org_id uuid, _record jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE member_scope text; owner_id uuid;
BEGIN
  IF NOT public.meets_mfa_policy(auth.uid()) THEN RETURN false; END IF;
  IF public.is_org_admin(auth.uid(), _org_id) THEN RETURN true; END IF;
  SELECT coalesce(op.data_scope, 'own') INTO member_scope FROM public.organization_members om
    LEFT JOIN public.organization_profiles op ON op.id = om.profile_id AND op.organization_id = om.organization_id
    WHERE om.user_id = auth.uid() AND om.organization_id = _org_id AND om.is_active;
  IF NOT FOUND THEN RETURN false; END IF;
  IF member_scope = 'all' THEN RETURN true; END IF;
  owner_id := coalesce(nullif(_record->>'assigned_to',''), nullif(_record->>'seller_id',''),
    nullif(_record->>'created_by',''), nullif(_record->>'user_id',''))::uuid;
  IF owner_id = auth.uid() THEN RETURN true; END IF;
  RETURN member_scope = 'team' AND EXISTS (
    SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id
    WHERE t.organization_id = _org_id AND t.leader_id = auth.uid() AND tm.user_id = owner_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.can_write_owned_record(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_owned_record(uuid,jsonb) TO authenticated;

DO $$
DECLARE tbl text; predicate text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['leads','crm_clients','proposals','sales'] LOOP
    predicate := format('public.can_write_owned_record(organization_id,to_jsonb(%I))',tbl);
    EXECUTE format('CREATE POLICY security_record_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated
      USING (%s) WITH CHECK (%s)',tbl,predicate,predicate);
    EXECUTE format('CREATE POLICY security_record_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated
      USING (%s)',tbl,predicate);
  END LOOP;
END;
$$;

COMMIT;
