-- Existing recurrences can carry a legacy next_cycle_date that does not match
-- anchor_date. Honor that stored date for the current cycle, then return future
-- cycles to the configured anchor without rewriting customer schedules in bulk.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_recurring_cycle(
  p_recurrence_id uuid,
  p_period_start date
)
RETURNS public.sale_recurring_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recurrence public.sale_recurrences%rowtype;
  v_cycle public.sale_recurring_cycles%rowtype;
  v_period_start date;
  v_next_month date;
  v_next_cycle_date date;
  v_claim_role text;
  v_caller_id uuid;
BEGIN
  IF p_recurrence_id IS NULL OR p_period_start IS NULL THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'recurrence and period start are required';
  END IF;

  SELECT * INTO v_recurrence
  FROM public.sale_recurrences
  WHERE id = p_recurrence_id
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
     AND (v_caller_id IS NULL OR NOT public.is_org_member(v_caller_id, v_recurrence.organization_id)) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'not authorized for this organization';
  END IF;

  v_period_start := p_period_start;

  IF v_period_start < v_recurrence.anchor_date THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'period start precedes recurrence anchor';
  END IF;

  v_next_month := (
    date_trunc('month', v_period_start) + make_interval(months => v_recurrence.interval_count)
  )::date;
  v_next_cycle_date := make_date(
    extract(year FROM v_next_month)::integer,
    extract(month FROM v_next_month)::integer,
    least(
      extract(day FROM v_recurrence.anchor_date)::integer,
      extract(day FROM (v_next_month + interval '1 month - 1 day'))::integer
    )
  );

  SELECT * INTO v_cycle
  FROM public.sale_recurring_cycles
  WHERE recurrence_id = v_recurrence.id
    AND period_start = v_period_start
    AND period_end = v_next_cycle_date - 1;

  IF FOUND THEN
    RETURN v_cycle;
  END IF;

  IF v_recurrence.service_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'recurrence state cannot generate cycles';
  END IF;

  IF v_recurrence.next_cycle_date IS NULL
     OR p_period_start IS DISTINCT FROM v_recurrence.next_cycle_date THEN
    RAISE EXCEPTION USING errcode = '23514', message = 'period start must match the next cycle date';
  END IF;

  INSERT INTO public.sale_recurring_cycles (
    recurrence_id,
    sale_id,
    organization_id,
    period_start,
    period_end,
    due_date,
    amount,
    currency
  ) VALUES (
    v_recurrence.id,
    v_recurrence.sale_id,
    v_recurrence.organization_id,
    v_period_start,
    v_next_cycle_date - 1,
    v_period_start,
    v_recurrence.amount,
    v_recurrence.currency
  )
  ON CONFLICT (recurrence_id, period_start, period_end) DO NOTHING;

  SELECT * INTO STRICT v_cycle
  FROM public.sale_recurring_cycles
  WHERE recurrence_id = v_recurrence.id
    AND period_start = v_period_start
    AND period_end = v_next_cycle_date - 1;

  UPDATE public.sale_recurrences
  SET
    last_cycle_date = CASE
      WHEN last_cycle_date IS NULL OR v_period_start > last_cycle_date THEN v_period_start
      ELSE last_cycle_date
    END,
    next_cycle_date = CASE
      WHEN last_cycle_date IS NULL OR v_period_start >= last_cycle_date THEN v_next_cycle_date
      ELSE next_cycle_date
    END
  WHERE id = v_recurrence.id;

  RETURN v_cycle;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recurring_cycle(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_recurring_cycle(uuid, date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
