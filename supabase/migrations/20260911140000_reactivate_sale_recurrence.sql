BEGIN;

CREATE OR REPLACE FUNCTION public.reactivate_sale_recurrence(
  p_sale_id uuid,
  p_next_cycle_date date
)
RETURNS public.sale_recurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous public.sale_recurrences%rowtype;
  v_recurrence public.sale_recurrences%rowtype;
  v_claim_role text;
  v_caller_id uuid;
BEGIN
  IF p_sale_id IS NULL OR p_next_cycle_date IS NULL THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'sale and next cycle date are required';
  END IF;

  SELECT * INTO v_previous
  FROM public.sale_recurrences
  WHERE sale_id = p_sale_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'sale recurrence not found';
  END IF;

  BEGIN
    v_claim_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_claim_role := NULL;
  END;
  v_caller_id := auth.uid();

  IF v_claim_role IS DISTINCT FROM 'service_role'
     AND (v_caller_id IS NULL OR NOT public.is_org_member(v_caller_id, v_previous.organization_id)) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'not authorized for this organization';
  END IF;

  IF v_previous.service_status NOT IN ('cancelled', 'inactive') THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'only a closed recurrence can be reactivated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sale_recurrences
    WHERE sale_id = p_sale_id
      AND service_status IN ('pending', 'active', 'paused')
  ) THEN
    RAISE EXCEPTION USING errcode = '23505', message = 'sale already has an open recurrence';
  END IF;

  INSERT INTO public.sale_recurrences (
    organization_id, sale_id, amount, currency, interval, interval_count,
    anchor_date, service_status, billing_status, billing_provider,
    next_cycle_date
  ) VALUES (
    v_previous.organization_id, v_previous.sale_id, v_previous.amount,
    v_previous.currency, v_previous.interval, v_previous.interval_count,
    p_next_cycle_date, 'active', 'not_started', v_previous.billing_provider,
    p_next_cycle_date
  )
  RETURNING * INTO v_recurrence;

  UPDATE public.sales
  SET
    has_recurring = true,
    recurring_status = 'active',
    recurring_value = v_previous.amount,
    next_renewal_date = p_next_cycle_date
  WHERE id = p_sale_id
    AND organization_id = v_previous.organization_id;

  RETURN v_recurrence;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_sale_recurrence(uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_sale_recurrence(uuid, date)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
