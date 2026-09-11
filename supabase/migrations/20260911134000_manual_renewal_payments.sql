BEGIN;

CREATE OR REPLACE FUNCTION public.create_manual_renewal_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sale_recurrences recurrence
    WHERE recurrence.id = NEW.recurrence_id
      AND recurrence.organization_id = NEW.organization_id
      AND recurrence.billing_provider = 'manual'
  ) THEN
    INSERT INTO public.sale_payments (
      organization_id,
      sale_id,
      amount,
      payment_date,
      payment_method,
      status,
      notes,
      recurring_cycle_id,
      billing_period_start,
      billing_period_end
    ) VALUES (
      NEW.organization_id,
      NEW.sale_id,
      NEW.amount,
      NEW.due_date,
      'other',
      'pending',
      'Renovação mensal',
      NEW.id,
      NEW.period_start,
      NEW.period_end
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_renewal_payment()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS create_manual_renewal_payment_trg
  ON public.sale_recurring_cycles;
CREATE TRIGGER create_manual_renewal_payment_trg
AFTER INSERT ON public.sale_recurring_cycles
FOR EACH ROW
EXECUTE FUNCTION public.create_manual_renewal_payment();

INSERT INTO public.sale_payments (
  organization_id,
  sale_id,
  amount,
  payment_date,
  payment_method,
  status,
  notes,
  recurring_cycle_id,
  billing_period_start,
  billing_period_end
)
SELECT
  cycle.organization_id,
  cycle.sale_id,
  cycle.amount,
  cycle.due_date,
  'other',
  'pending',
  'Renovação mensal',
  cycle.id,
  cycle.period_start,
  cycle.period_end
FROM public.sale_recurring_cycles cycle
JOIN public.sale_recurrences recurrence
  ON recurrence.id = cycle.recurrence_id
 AND recurrence.organization_id = cycle.organization_id
WHERE recurrence.billing_provider = 'manual'
  AND NOT EXISTS (
    SELECT 1
    FROM public.sale_payments payment
    WHERE payment.recurring_cycle_id = cycle.id
  );

COMMIT;
