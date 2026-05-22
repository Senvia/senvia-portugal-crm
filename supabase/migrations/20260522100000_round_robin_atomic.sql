-- Atomic round-robin assignment function.
-- Uses SELECT FOR UPDATE to lock the org row, preventing race conditions
-- when multiple leads arrive simultaneously.
CREATE OR REPLACE FUNCTION get_next_round_robin_assignee(
  p_org_id uuid,
  p_exclude_admins boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings     jsonb;
  v_members      uuid[];
  v_member_count integer;
  v_current_idx  integer;
  v_safe_idx     integer;
  v_assigned     uuid;
BEGIN
  -- Lock the org row so concurrent calls queue here instead of racing
  SELECT sales_settings
  INTO v_settings
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Collect eligible members: active, not paused, optional admin exclusion
  SELECT array_agg(user_id ORDER BY joined_at ASC)
  INTO v_members
  FROM organization_members
  WHERE organization_id = p_org_id
    AND is_active = true
    AND (paused_until IS NULL OR paused_until < now())
    AND (NOT p_exclude_admins OR role != 'admin');

  IF v_members IS NULL THEN
    RETURN NULL;
  END IF;

  v_member_count := array_length(v_members, 1);

  IF v_member_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Current index (0-based, stored in sales_settings)
  v_current_idx := coalesce((v_settings->>'round_robin_index')::integer, 0);
  v_safe_idx    := v_current_idx % v_member_count; -- clamp in case team shrank
  v_assigned    := v_members[v_safe_idx + 1];      -- arrays are 1-based in PL/pgSQL

  -- Advance index atomically
  UPDATE organizations
  SET sales_settings = jsonb_set(
    coalesce(sales_settings, '{}'::jsonb),
    '{round_robin_index}',
    to_jsonb((v_safe_idx + 1) % v_member_count)
  )
  WHERE id = p_org_id;

  RETURN v_assigned;
END;
$$;
