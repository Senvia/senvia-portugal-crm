
CREATE OR REPLACE FUNCTION public.prevent_assign_to_paused_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _paused_until timestamptz;
  _is_active boolean;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if assignment did not change on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  SELECT om.paused_until, om.is_active
    INTO _paused_until, _is_active
  FROM public.organization_members om
  WHERE om.organization_id = NEW.organization_id
    AND om.user_id = NEW.assigned_to
  LIMIT 1;

  IF _is_active IS NULL OR _is_active = false THEN
    -- Not a member of this org or inactive; allow but UI prevents this
    RETURN NEW;
  END IF;

  IF _paused_until IS NOT NULL AND _paused_until > now() THEN
    RAISE EXCEPTION 'Comercial pausado para receber leads até %', _paused_until
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_assign_lead_to_paused_member ON public.leads;
CREATE TRIGGER prevent_assign_lead_to_paused_member
BEFORE INSERT OR UPDATE OF assigned_to ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.prevent_assign_to_paused_member();
