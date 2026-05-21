-- Bulk lead import fast path.
--
-- Problem: importing many leads fired two per-row AFTER INSERT triggers
-- inside the INSERT transaction:
--   * automation_leads_insert -> notify_automation_trigger() -> 1 HTTP call per lead
--   * trg_lead_auto_lists     -> sync_lead_to_auto_lists()   -> ~10 queries per lead
-- A large import (1000-5000 rows) therefore executed thousands of queries plus
-- thousands of HTTP calls in a single statement, blew past statement_timeout,
-- failed the whole chunk, and hammered the database for the whole organization.
--
-- Fix: a transaction-local flag (app.skip_lead_side_effects) lets a dedicated
-- bulk-import RPC insert leads WITHOUT firing those triggers. This also matches
-- the UI promise that imports are "silenciosas" (no automations fired).
--
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 1. Automation trigger: skip side effects during bulk import
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_automation_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _trigger_type text;
  _org_id uuid;
  _payload jsonb;
BEGIN
  -- Skip during bulk import (silent import: no automations)
  IF current_setting('app.skip_lead_side_effects', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Determine trigger type and org_id
  IF TG_TABLE_NAME = 'leads' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'lead_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'lead_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_clients' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'client_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'client_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'sales' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'sale_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'sale_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'proposal_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'proposal_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Build payload
  _payload := jsonb_build_object(
    'trigger_type', _trigger_type,
    'organization_id', _org_id,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Call edge function via pg_net
  PERFORM net.http_post(
    url := 'https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/process-automation',
    body := _payload,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGNvYmlyemdwZmNybnh6bndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDIxNDEsImV4cCI6MjA4MzM3ODE0MX0.wn6rMm8gOMJMgnB0jBStpcj5WlybmvauH_th3dcYTuw"}'::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Automation trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2. Auto-list sync: skip side effects during bulk import
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_lead_to_auto_lists()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
  v_list_novos_id uuid;
  v_list_clientes_id uuid;
  v_list_nao_conv_id uuid;
  v_stage record;
  v_first_stage_key text;
BEGIN
  -- Skip during bulk import (silent import: no marketing-list sync)
  IF current_setting('app.skip_lead_side_effects', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Skip leads without email
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  -- Ensure auto-lists exist
  PERFORM ensure_org_auto_lists(NEW.organization_id);

  -- Get list IDs
  SELECT id INTO v_list_novos_id FROM client_lists
    WHERE organization_id = NEW.organization_id AND name = 'Leads Novos' AND is_system = true LIMIT 1;
  SELECT id INTO v_list_clientes_id FROM client_lists
    WHERE organization_id = NEW.organization_id AND name = 'Clientes' AND is_system = true LIMIT 1;
  SELECT id INTO v_list_nao_conv_id FROM client_lists
    WHERE organization_id = NEW.organization_id AND name = 'Leads Não Convertidas' AND is_system = true LIMIT 1;

  -- Upsert marketing contact from lead data
  INSERT INTO marketing_contacts (organization_id, name, email, phone, source)
  VALUES (NEW.organization_id, NEW.name, NEW.email, NEW.phone, COALESCE(NEW.source, 'lead'))
  ON CONFLICT (organization_id, email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, marketing_contacts.phone),
    updated_at = now()
  RETURNING id INTO v_contact_id;

  IF v_contact_id IS NULL THEN
    SELECT id INTO v_contact_id FROM marketing_contacts
      WHERE organization_id = NEW.organization_id AND email = NEW.email LIMIT 1;
  END IF;

  IF v_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the first pipeline stage (lowest position = "Novo")
  SELECT key INTO v_first_stage_key FROM pipeline_stages
    WHERE organization_id = NEW.organization_id
    ORDER BY position ASC LIMIT 1;

  -- Get current stage info
  SELECT * INTO v_stage FROM pipeline_stages
    WHERE organization_id = NEW.organization_id AND key = NEW.status LIMIT 1;

  -- Remove from all auto-lists
  DELETE FROM marketing_list_members
    WHERE contact_id = v_contact_id
    AND list_id IN (v_list_novos_id, v_list_clientes_id, v_list_nao_conv_id);

  -- Add to the correct list based on pipeline stage
  IF NEW.status = v_first_stage_key OR v_stage IS NULL THEN
    INSERT INTO marketing_list_members (list_id, contact_id)
    VALUES (v_list_novos_id, v_contact_id)
    ON CONFLICT (list_id, contact_id) DO NOTHING;
  ELSIF v_stage.is_final_positive = true THEN
    INSERT INTO marketing_list_members (list_id, contact_id)
    VALUES (v_list_clientes_id, v_contact_id)
    ON CONFLICT (list_id, contact_id) DO NOTHING;
  ELSIF v_stage.is_final_negative = true THEN
    INSERT INTO marketing_list_members (list_id, contact_id)
    VALUES (v_list_nao_conv_id, v_contact_id)
    ON CONFLICT (list_id, contact_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. Bulk import RPC: UPSERT leads with side-effect triggers off
-- ============================================================
-- The import no longer creates duplicates: for each row, if a lead with the
-- same real email already exists in the organization it is UPDATED; otherwise
-- a new lead is inserted. Empty and placeholder emails (@placeholder.local)
-- are never treated as a match key.
--
-- SECURITY INVOKER on purpose: the statements below still run as the calling
-- user, so the existing leads RLS policies keep enforcing organization
-- isolation. The function only adds a transaction-local flag that the
-- per-row triggers honour (kept off for speed during bulk import).
DROP FUNCTION IF EXISTS public.import_leads_bulk(jsonb);

CREATE FUNCTION public.import_leads_bulk(p_leads jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  _inserted integer := 0;
  _updated integer := 0;
BEGIN
  -- Disable per-row side-effect triggers for THIS transaction only
  PERFORM set_config('app.skip_lead_side_effects', 'on', true);

  -- Update existing leads matched by real email (case-insensitive, per org)
  UPDATE public.leads l SET
    name         = x.name,
    email        = x.email,
    phone        = x.phone,
    company_name = x.company_name,
    company_nif  = x.company_nif,
    source       = x.source,
    notes        = x.notes,
    value        = x.value,
    status       = x.status,
    assigned_to  = x.assigned_to,
    import_id    = x.import_id,
    updated_at   = now()
  FROM jsonb_to_recordset(p_leads) AS x(
    organization_id uuid, assigned_to uuid, status text, name text,
    email text, phone text, company_name text, company_nif text,
    source text, notes text, value numeric,
    gdpr_consent boolean, automation_enabled boolean, import_id uuid
  )
  WHERE l.organization_id = x.organization_id
    AND x.email IS NOT NULL AND x.email <> ''
    AND x.email NOT LIKE '%@placeholder.local'
    AND lower(l.email) = lower(x.email);
  GET DIAGNOSTICS _updated = ROW_COUNT;

  -- Insert rows that have no matching existing lead
  INSERT INTO public.leads (
    organization_id, assigned_to, status, name, email, phone,
    company_name, company_nif, source, notes, value,
    gdpr_consent, automation_enabled, import_id
  )
  SELECT
    x.organization_id, x.assigned_to, x.status, x.name, x.email, x.phone,
    x.company_name, x.company_nif, x.source, x.notes, x.value,
    COALESCE(x.gdpr_consent, true), COALESCE(x.automation_enabled, false), x.import_id
  FROM jsonb_to_recordset(p_leads) AS x(
    organization_id uuid, assigned_to uuid, status text, name text,
    email text, phone text, company_name text, company_nif text,
    source text, notes text, value numeric,
    gdpr_consent boolean, automation_enabled boolean, import_id uuid
  )
  WHERE NOT (
    x.email IS NOT NULL AND x.email <> ''
    AND x.email NOT LIKE '%@placeholder.local'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.organization_id = x.organization_id
        AND lower(l.email) = lower(x.email)
    )
  );
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  RETURN jsonb_build_object('inserted', _inserted, 'updated', _updated);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.import_leads_bulk(jsonb) TO authenticated;
