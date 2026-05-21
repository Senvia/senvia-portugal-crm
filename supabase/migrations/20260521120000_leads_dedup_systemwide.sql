-- System-wide protection against duplicate leads.
--
-- After this runs, no path in the app can create a second lead with an email
-- that already exists in the same organization: a duplicate INSERT is turned
-- into an UPDATE of the existing lead. Empty emails and placeholder emails
-- (anything ending in @placeholder.local) are exempt — they can repeat.
--
-- IMPORTANT: run the duplicate-cleanup script FIRST. The unique index below
-- cannot be created while duplicate emails still exist in any organization.
--
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 1. Unique index: one lead per real email per organization
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_email_unique
  ON public.leads (organization_id, lower(email))
  WHERE email IS NOT NULL
    AND email <> ''
    AND email NOT LIKE '%@placeholder.local';

-- ============================================================
-- 2. BEFORE INSERT trigger: redirect a duplicate insert to an update
-- ============================================================
-- Any insert (manual, public form, prospect conversion, API, ...) that would
-- create a duplicate email instead refreshes the existing lead's contact
-- details and is cancelled. The lead's pipeline stage, owner, notes and value
-- are kept intact so a re-submission never drags a worked lead backwards.
-- The bulk import sets app.skip_lead_side_effects and handles its own
-- de-duplication, so it is skipped here.
CREATE OR REPLACE FUNCTION public.dedup_lead_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_id uuid;
BEGIN
  -- Bulk import de-duplicates itself; let it through.
  IF current_setting('app.skip_lead_side_effects', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- No real email -> cannot match a duplicate; allow the insert.
  IF NEW.email IS NULL
     OR NEW.email = ''
     OR NEW.email LIKE '%@placeholder.local' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _existing_id
  FROM public.leads
  WHERE organization_id = NEW.organization_id
    AND lower(email) = lower(NEW.email)
  LIMIT 1;

  -- Genuinely new lead.
  IF _existing_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Duplicate: refresh contact details on the existing lead, keep its
  -- pipeline state, then cancel this insert.
  UPDATE public.leads SET
    name         = COALESCE(NULLIF(NEW.name, ''), name),
    phone        = COALESCE(NULLIF(NEW.phone, ''), phone),
    company_name = COALESCE(NULLIF(NEW.company_name, ''), company_name),
    company_nif  = COALESCE(NULLIF(NEW.company_nif, ''), company_nif),
    updated_at   = now()
  WHERE id = _existing_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS dedup_lead_before_insert ON public.leads;
CREATE TRIGGER dedup_lead_before_insert
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.dedup_lead_before_insert();
