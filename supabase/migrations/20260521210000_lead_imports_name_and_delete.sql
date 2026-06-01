-- Lead-import history: user-given name + ability to delete a whole batch.
--
-- Rule: a batch can only be deleted if NONE of its leads has any activity
-- (proposals, sales, orders, calendar events, crm_clients). All-or-nothing —
-- if even one lead was already worked on, the whole import is locked.

-- ============================================================
-- 1. User-given name for each import
-- ============================================================
ALTER TABLE public.lead_imports
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.lead_imports.name IS
  'User-given label for this import batch (mandatory in the UI). Used by the admin to identify the batch in the history list.';

-- ============================================================
-- 2. DELETE policy on lead_imports
--    Admin or anyone with granular leads.imports.delete permission.
-- ============================================================
DROP POLICY IF EXISTS "Org admins delete imports" ON public.lead_imports;
CREATE POLICY "Org admins delete imports"
  ON public.lead_imports
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.organization_profiles op ON op.id = om.profile_id
        WHERE om.user_id = auth.uid()
          AND om.organization_id = lead_imports.organization_id
          AND COALESCE(
            (op.module_permissions #> '{leads,subareas,imports,delete}')::boolean,
            false
          ) = true
      )
    )
  );

-- ============================================================
-- 3. RPC: preview the impact of deleting an import
-- ============================================================
CREATE OR REPLACE FUNCTION public.preview_lead_import_delete(p_import_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total integer;
  _with_activity integer;
BEGIN
  -- Membership is enforced by lead_imports SELECT policy via this query
  IF NOT EXISTS (SELECT 1 FROM public.lead_imports WHERE id = p_import_id) THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  SELECT count(*) INTO _total FROM public.leads WHERE import_id = p_import_id;

  SELECT count(*) INTO _with_activity
  FROM public.leads l
  WHERE l.import_id = p_import_id
    AND (
      EXISTS (SELECT 1 FROM public.proposals       p WHERE p.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.crm_clients     c WHERE c.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.sales           s WHERE s.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.orders          o WHERE o.lead_id = l.id)
    );

  RETURN jsonb_build_object(
    'total_leads', _total,
    'with_activity', _with_activity,
    'can_delete', _with_activity = 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_lead_import_delete(uuid) TO authenticated;

-- ============================================================
-- 4. RPC: delete an import (and all its leads)
--    Blocks if ANY lead has activity. All-or-nothing.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_lead_import(p_import_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _can boolean;
  _with_activity integer;
  _deleted integer;
BEGIN
  SELECT organization_id INTO _org_id FROM public.lead_imports WHERE id = p_import_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  -- Must be member of the org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Admin OR granular permission leads.imports.delete
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organization_profiles op ON op.id = om.profile_id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = _org_id
        AND COALESCE(
          (op.module_permissions #> '{leads,subareas,imports,delete}')::boolean,
          false
        ) = true
    )
  INTO _can;

  IF NOT _can THEN
    RAISE EXCEPTION 'Permission denied: leads.imports.delete';
  END IF;

  -- Block if any lead has activity
  SELECT count(*) INTO _with_activity
  FROM public.leads l
  WHERE l.import_id = p_import_id
    AND (
      EXISTS (SELECT 1 FROM public.proposals       p WHERE p.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.crm_clients     c WHERE c.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.sales           s WHERE s.lead_id = l.id)
      OR EXISTS (SELECT 1 FROM public.orders          o WHERE o.lead_id = l.id)
    );

  IF _with_activity > 0 THEN
    RAISE EXCEPTION 'Cannot delete: % lead(s) have activity', _with_activity
      USING ERRCODE = 'check_violation';
  END IF;

  -- Safe to delete all leads of the batch and the import record itself
  DELETE FROM public.leads WHERE import_id = p_import_id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  DELETE FROM public.lead_imports WHERE id = p_import_id;

  RETURN jsonb_build_object('deleted', _deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_lead_import(uuid) TO authenticated;
