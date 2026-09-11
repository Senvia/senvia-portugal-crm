BEGIN;

CREATE OR REPLACE FUNCTION public.sync_recurring_cycle_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle_id uuid;
BEGIN
  v_cycle_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.recurring_cycle_id ELSE NEW.recurring_cycle_id END;

  IF v_cycle_id IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      UPDATE public.sale_recurring_cycles
      SET status = 'pending', paid_at = NULL
      WHERE id = v_cycle_id;
    ELSE
      UPDATE public.sale_recurring_cycles
      SET
        status = CASE WHEN NEW.status = 'paid' THEN 'paid' ELSE 'pending' END,
        paid_at = CASE
          WHEN NEW.status = 'paid' THEN COALESCE(paid_at, now())
          ELSE NULL
        END
      WHERE id = v_cycle_id;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.recurring_cycle_id IS DISTINCT FROM NEW.recurring_cycle_id
     AND OLD.recurring_cycle_id IS NOT NULL THEN
    UPDATE public.sale_recurring_cycles
    SET status = 'pending', paid_at = NULL
    WHERE id = OLD.recurring_cycle_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_recurring_cycle_from_payment()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_recurring_cycle_from_payment_trg
  ON public.sale_payments;
CREATE TRIGGER sync_recurring_cycle_from_payment_trg
AFTER INSERT OR UPDATE OF status, recurring_cycle_id OR DELETE
ON public.sale_payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_recurring_cycle_from_payment();

UPDATE public.sale_recurring_cycles cycle
SET
  status = CASE WHEN payment.status = 'paid' THEN 'paid' ELSE 'pending' END,
  paid_at = CASE
    WHEN payment.status = 'paid' THEN COALESCE(cycle.paid_at, payment.updated_at, payment.created_at, now())
    ELSE NULL
  END
FROM public.sale_payments payment
WHERE payment.recurring_cycle_id = cycle.id
  AND (
    cycle.status IS DISTINCT FROM CASE WHEN payment.status = 'paid' THEN 'paid' ELSE 'pending' END
    OR (payment.status = 'paid' AND cycle.paid_at IS NULL)
  );

COMMIT;
