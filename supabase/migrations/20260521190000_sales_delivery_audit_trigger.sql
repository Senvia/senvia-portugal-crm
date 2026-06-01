-- Auto-fill audit fields (approved_by, approved_at) when a sale is marked as
-- delivered/fulfilled. The "approval" is no longer a separate UI step — it is
-- the natural sales workflow: admin changes status to "delivered" in the Sales
-- page and the commission becomes confirmed.
--
-- This trigger guarantees we always have a who/when audit trail without forcing
-- every code path to remember to set those fields.

CREATE OR REPLACE FUNCTION public.auto_audit_sale_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Going INTO a delivered state: stamp audit fields if caller didn't supply them
  IF NEW.status IN ('delivered', 'fulfilled')
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('delivered', 'fulfilled')) THEN
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;

  -- Going OUT of a delivered state: clear audit fields
  IF TG_OP = 'UPDATE'
     AND NEW.status NOT IN ('delivered', 'fulfilled')
     AND OLD.status IN ('delivered', 'fulfilled') THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_audit_sale_delivery ON public.sales;
CREATE TRIGGER auto_audit_sale_delivery
  BEFORE INSERT OR UPDATE OF status ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_audit_sale_delivery();
