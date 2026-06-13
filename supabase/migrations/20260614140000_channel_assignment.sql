-- ============================================================================
-- Caixas de Entrada — associate collaborators to a channel.
--   assigned_user_ids: who "attends" this caixa (empty = everyone, no restriction).
--   rotate_enabled / round_robin_index: optional round-robin distribution of new
--   conversations among those collaborators (used by the webhook in a later phase).
-- Drives: inbox visibility, auto-assignment and notifications per caixa.
-- ============================================================================

ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS assigned_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rotate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS round_robin_index integer NOT NULL DEFAULT 0;

-- Atomic round-robin assignee for a channel (mirrors get_next_form_assignee).
--   rotate_enabled = false -> always the 1st collaborator
--   rotate_enabled = true  -> round-robin among assigned_user_ids
CREATE OR REPLACE FUNCTION public.get_next_channel_assignee(p_channel_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_members  uuid[];
  v_idx      integer;
  v_rotate   boolean;
  v_count    integer;
  v_safe_idx integer;
  v_assigned uuid;
BEGIN
  SELECT assigned_user_ids, round_robin_index, rotate_enabled
  INTO v_members, v_idx, v_rotate
  FROM public.messaging_channels
  WHERE id = p_channel_id
  FOR UPDATE;

  IF NOT FOUND OR v_members IS NULL THEN
    RETURN NULL;
  END IF;

  v_count := array_length(v_members, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RETURN NULL;
  END IF;

  IF NOT v_rotate THEN
    RETURN v_members[1];
  END IF;

  v_safe_idx := coalesce(v_idx, 0) % v_count;
  v_assigned := v_members[v_safe_idx + 1];

  UPDATE public.messaging_channels
  SET round_robin_index = (v_safe_idx + 1) % v_count
  WHERE id = p_channel_id;

  RETURN v_assigned;
END;
$$;
