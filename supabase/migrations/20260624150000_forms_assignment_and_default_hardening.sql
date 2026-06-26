-- Forms hardening:
-- 1) Round-robin / fixed assignment (form + webhook) must skip members who left
--    or are paused, so leads aren't dropped on a deactivated/vacationing seller.
--    Filter assigned_user_ids to active, non-paused org members (preserving the
--    configured order) before picking. Falls back to the first configured member
--    if none are active (better than NULL = unassigned).
-- 2) Guarantee at most one default form per org (partial unique index), so the
--    "set as default" two-step can't leave an org with multiple defaults.

CREATE OR REPLACE FUNCTION public.get_next_form_assignee(p_form_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_members  uuid[];
  v_active   uuid[];
  v_idx      integer;
  v_rotate   boolean;
  v_count    integer;
  v_safe_idx integer;
  v_org      uuid;
BEGIN
  SELECT assigned_user_ids, round_robin_index, rotate_enabled, organization_id
  INTO v_members, v_idx, v_rotate, v_org
  FROM public.forms
  WHERE id = p_form_id
  FOR UPDATE;

  IF NOT FOUND OR v_members IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(t.m ORDER BY t.ord)
  INTO v_active
  FROM unnest(v_members) WITH ORDINALITY AS t(m, ord)
  WHERE EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org AND om.user_id = t.m
      AND om.is_active AND (om.paused_until IS NULL OR om.paused_until <= now())
  );

  IF v_active IS NULL OR array_length(v_active, 1) IS NULL THEN
    RETURN v_members[1];
  END IF;

  v_count := array_length(v_active, 1);
  IF NOT v_rotate THEN
    RETURN v_active[1];
  END IF;

  v_safe_idx := coalesce(v_idx, 0) % v_count;
  UPDATE public.forms
  SET round_robin_index = (v_safe_idx + 1) % v_count
  WHERE id = p_form_id;

  RETURN v_active[v_safe_idx + 1];
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_webhook_assignee(p_webhook_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_members  uuid[];
  v_active   uuid[];
  v_idx      integer;
  v_rotate   boolean;
  v_count    integer;
  v_safe_idx integer;
  v_org      uuid;
BEGIN
  SELECT assigned_user_ids, round_robin_index, rotate_enabled, organization_id
  INTO v_members, v_idx, v_rotate, v_org
  FROM public.lead_intake_webhooks
  WHERE id = p_webhook_id
  FOR UPDATE;

  IF NOT FOUND OR v_members IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(t.m ORDER BY t.ord)
  INTO v_active
  FROM unnest(v_members) WITH ORDINALITY AS t(m, ord)
  WHERE EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org AND om.user_id = t.m
      AND om.is_active AND (om.paused_until IS NULL OR om.paused_until <= now())
  );

  IF v_active IS NULL OR array_length(v_active, 1) IS NULL THEN
    RETURN v_members[1];
  END IF;

  v_count := array_length(v_active, 1);
  IF NOT v_rotate THEN
    RETURN v_active[1];
  END IF;

  v_safe_idx := coalesce(v_idx, 0) % v_count;
  UPDATE public.lead_intake_webhooks
  SET round_robin_index = (v_safe_idx + 1) % v_count
  WHERE id = p_webhook_id;

  RETURN v_active[v_safe_idx + 1];
END;
$function$;

-- At most one default form per org.
CREATE UNIQUE INDEX IF NOT EXISTS forms_one_default_per_org
  ON public.forms (organization_id)
  WHERE is_default;
