BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_recurrence_with_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.sale_recurrences
    SET
      service_status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, now())
    WHERE sale_id = NEW.id
      AND organization_id = NEW.organization_id
      AND service_status IN ('pending', 'active', 'paused');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_recurrence_with_sale()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cancel_recurrence_with_sale_trg ON public.sales;
CREATE TRIGGER cancel_recurrence_with_sale_trg
AFTER UPDATE OF status ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.cancel_recurrence_with_sale();

UPDATE public.sale_recurrences recurrence
SET
  service_status = 'cancelled',
  cancelled_at = COALESCE(recurrence.cancelled_at, sale.updated_at, now())
FROM public.sales sale
WHERE sale.id = recurrence.sale_id
  AND sale.organization_id = recurrence.organization_id
  AND sale.status = 'cancelled'
  AND recurrence.service_status IN ('pending', 'active', 'paused');

COMMIT;
