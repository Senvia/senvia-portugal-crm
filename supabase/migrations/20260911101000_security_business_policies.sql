BEGIN;

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid, _org_id uuid, _module text, _subarea text, _action text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE member_role text; permissions jsonb; profile_role text;
BEGIN
  IF NOT public.meets_mfa_policy(_user_id) THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'super_admin') THEN RETURN true; END IF;
  SELECT om.role::text, op.base_role::text, op.module_permissions::jsonb
    INTO member_role, profile_role, permissions
    FROM public.organization_members om
    LEFT JOIN public.organization_profiles op
      ON op.id = om.profile_id AND op.organization_id = om.organization_id
    WHERE om.user_id = _user_id AND om.organization_id = _org_id AND om.is_active;
  IF NOT FOUND THEN RETURN false; END IF;
  IF coalesce(profile_role, member_role) = 'viewer' AND _action <> 'view' THEN RETURN false; END IF;
  IF permissions IS NOT NULL THEN
    IF permissions #> ARRAY[_module, 'subareas'] IS NOT NULL THEN
      RETURN coalesce(permissions #> ARRAY[_module, 'subareas', _subarea, _action] = 'true'::jsonb, false);
    END IF;
    RETURN coalesce(permissions #> ARRAY[_module,
      CASE WHEN _action IN ('view', 'delete') THEN _action ELSE 'edit' END] = 'true'::jsonb, false);
  END IF;
  RETURN member_role = 'admin' OR profile_role = 'admin'
    OR (_module <> 'settings' AND (member_role = 'salesperson' OR _action = 'view'));
END;
$$;
REVOKE ALL ON FUNCTION public.has_module_permission(uuid,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid,uuid,text,text,text) TO authenticated, service_role;

-- Restrictive policies intersect existing tenant/ownership policies: an old
-- permissive policy cannot independently grant a forbidden write.
DO $$
DECLARE entry record; action record; predicate text; org_expression text;
BEGIN
  FOR entry IN SELECT * FROM (VALUES
    ('leads', 'leads', 'kanban', 'add', 'edit', 'delete'),
    ('crm_clients', 'clients', 'list', 'add', 'edit', 'delete'),
    ('cpes', 'clients', 'cpes', 'add', 'edit', 'delete'),
    ('proposals', 'proposals', 'proposals', 'create', 'edit', 'delete'),
    ('sales', 'sales', 'sales', 'create', 'edit', 'delete'),
    ('sale_payments', 'sales', 'payments', 'add', 'add', 'add'),
    ('invoices', 'finance', 'invoices', 'issue', 'issue', 'cancel'),
    ('credit_notes', 'finance', 'invoices', 'issue', 'issue', 'cancel'),
    ('expenses', 'finance', 'expenses', 'add', 'edit', 'delete'),
    ('internal_requests', 'finance', 'requests', 'submit', 'approve', 'approve'),
    ('commission_closings', 'finance', 'commissions', 'manage', 'manage', 'manage'),
    ('calendar_events', 'calendar', 'events', 'create', 'edit', 'delete'),
    ('email_templates', 'marketing', 'templates', 'create', 'edit', 'delete')
    ,('proposal_products', 'proposals', 'proposals', 'create', 'edit', 'delete')
    ,('proposal_cpes', 'proposals', 'proposals', 'create', 'edit', 'delete')
    ,('lead_imports', 'leads', 'imports', 'import', 'import', 'delete')
  ) AS t(tbl, module, subarea, insert_action, update_action, delete_action)
  LOOP
    IF to_regclass('public.' || entry.tbl) IS NULL THEN CONTINUE; END IF;
    org_expression := 'organization_id';
    IF entry.tbl IN ('proposal_products', 'proposal_cpes') THEN
      org_expression := format('(SELECT organization_id FROM public.proposals WHERE id = %I.proposal_id)', entry.tbl);
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = entry.tbl AND column_name = 'organization_id') THEN
      RAISE EXCEPTION 'Permission mapping needs parent organization for %', entry.tbl;
    END IF;
    FOR action IN SELECT * FROM (VALUES ('INSERT', entry.insert_action),
      ('UPDATE', entry.update_action), ('DELETE', entry.delete_action)) AS a(cmd, permission)
    LOOP
      predicate := format('public.has_module_permission(auth.uid(), %s, %L, %L, %L)',
        org_expression, entry.module,
        CASE WHEN entry.tbl = 'lead_imports' AND action.cmd <> 'DELETE' THEN 'export' ELSE entry.subarea END,
        action.permission);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
        'security_permission_' || lower(action.cmd), entry.tbl, action.cmd,
        CASE action.cmd
          WHEN 'INSERT' THEN 'WITH CHECK (' || predicate || ')'
          WHEN 'DELETE' THEN 'USING (' || predicate || ')'
          ELSE 'USING (' || predicate || ') WITH CHECK (' || predicate || ')' END);
    END LOOP;
  END LOOP;
END;
$$;

-- Apply MFA to business data, while retaining enrollment bootstrap reads and
-- leaving the explicitly excluded store/e-commerce objects unchanged.
DO $$
DECLARE tbl record; policy record; using_sql text; check_sql text; admin_expression text;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND c.relname NOT IN ('organizations','organization_members','organization_profiles','profiles','user_roles',
        'ecommerce_products','product_categories','product_images','product_variants','inventory_movements',
        'customers','customer_addresses','orders','order_items','shipments','discount_codes')
      AND c.relname NOT LIKE 'store\_%' ESCAPE '\'
      AND c.relname NOT LIKE 'ecommerce\_%' ESCAPE '\'
  LOOP
    EXECUTE format('CREATE POLICY security_mfa ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING (public.meets_mfa_policy(auth.uid())) WITH CHECK (public.meets_mfa_policy(auth.uid()))', tbl.relname);
  END LOOP;

  FOR policy IN SELECT p.* FROM pg_policies p WHERE schemaname = 'public'
    AND (coalesce(qual, '') || coalesce(with_check, '')) ~ 'has_role\(auth.uid\(\), ''admin''::'
    AND tablename NOT IN ('user_roles','ecommerce_products','product_categories','product_images','product_variants',
      'inventory_movements','customers','customer_addresses','orders','order_items','shipments','discount_codes')
    AND tablename NOT LIKE 'store\_%' ESCAPE '\' AND tablename NOT LIKE 'ecommerce\_%' ESCAPE '\'
  LOOP
    admin_expression := CASE
      WHEN policy.tablename = 'organizations' THEN 'public.is_org_admin(auth.uid(), organizations.id)'
      WHEN policy.tablename = 'team_members' THEN
        'public.is_org_admin(auth.uid(), (SELECT security_team.organization_id FROM public.teams security_team WHERE security_team.id = team_members.team_id))'
      ELSE format('public.is_org_admin(auth.uid(), %I.organization_id)', policy.tablename) END;
    using_sql := regexp_replace(policy.qual,
      '(public\.)?has_role\(auth.uid\(\), ''admin''::(public\.)?app_role\)',
      admin_expression, 'g');
    check_sql := regexp_replace(policy.with_check,
      '(public\.)?has_role\(auth.uid\(\), ''admin''::(public\.)?app_role\)',
      admin_expression, 'g');
    EXECUTE format('ALTER POLICY %I ON public.%I %s %s', policy.policyname, policy.tablename,
      CASE WHEN using_sql IS NULL THEN '' ELSE 'USING (' || using_sql || ')' END,
      CASE WHEN check_sql IS NULL THEN '' ELSE 'WITH CHECK (' || check_sql || ')' END);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Admins view org member roles" ON public.user_roles;
CREATE POLICY "Admins view org member roles" ON public.user_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members target_member
  WHERE target_member.user_id = user_roles.user_id AND target_member.is_active
    AND public.is_org_admin(auth.uid(), target_member.organization_id)));

COMMIT;
