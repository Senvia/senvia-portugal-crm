BEGIN;

DO $migration$
BEGIN
  IF to_regprocedure('public.security_delete_lead_import_internal(uuid)') IS NULL
    AND to_regprocedure('public.delete_lead_import(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.delete_lead_import(uuid) RENAME TO security_delete_lead_import_internal;
  END IF;
  IF to_regprocedure('public.security_delete_lead_import_internal(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.security_delete_lead_import_internal(uuid) FROM PUBLIC, anon, authenticated;
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION public.delete_lead_import(p_import_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      DECLARE org_id uuid;
      BEGIN
        SELECT organization_id INTO org_id FROM public.lead_imports WHERE id = p_import_id;
        IF NOT public.has_module_permission(auth.uid(), org_id, 'leads', 'imports', 'delete') THEN
          RAISE EXCEPTION 'Permission denied: leads.imports.delete' USING ERRCODE = '42501';
        END IF;
        RETURN public.security_delete_lead_import_internal(p_import_id);
      END;
      $body$
    $function$;
    REVOKE ALL ON FUNCTION public.delete_lead_import(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.delete_lead_import(uuid) TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.security_preview_lead_import_delete_internal(uuid)') IS NULL
    AND to_regprocedure('public.preview_lead_import_delete(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.preview_lead_import_delete(uuid) RENAME TO security_preview_lead_import_delete_internal;
  END IF;
  IF to_regprocedure('public.security_preview_lead_import_delete_internal(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.security_preview_lead_import_delete_internal(uuid) FROM PUBLIC, anon, authenticated;
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION public.preview_lead_import_delete(p_import_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      DECLARE org_id uuid;
      BEGIN
        SELECT organization_id INTO org_id FROM public.lead_imports WHERE id = p_import_id;
        IF NOT public.has_module_permission(auth.uid(), org_id, 'leads', 'imports', 'delete') THEN
          RAISE EXCEPTION 'Permission denied: leads.imports.delete' USING ERRCODE = '42501';
        END IF;
        RETURN public.security_preview_lead_import_delete_internal(p_import_id);
      END;
      $body$
    $function$;
    REVOKE ALL ON FUNCTION public.preview_lead_import_delete(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.preview_lead_import_delete(uuid) TO authenticated, service_role;
  END IF;
END;
$migration$;

COMMIT;
