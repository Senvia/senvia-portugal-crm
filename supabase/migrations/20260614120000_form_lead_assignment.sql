-- ============================================================================
-- Form lead assignment — bring forms to parity with lead_intake_webhooks:
-- toggleable round-robin distribution, multiple recipients, and an
-- "also notify admins" switch. Mirrors the inbound webhook model so the form
-- editor can reuse the same UI and the submit-lead function the same RPC shape.
-- ============================================================================

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS assigned_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rotate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_all_admins boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS round_robin_index integer NOT NULL DEFAULT 0;

-- Backfill: a form that already had a single fixed assignee keeps it as the
-- (only) recipient, rotation off. Legacy `assigned_to` is left untouched for
-- backward compatibility but the new array is now authoritative.
UPDATE public.forms
SET assigned_user_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL
  AND (assigned_user_ids IS NULL OR array_length(assigned_user_ids, 1) IS NULL);

-- ============================================================================
-- RPC atómico: próximo responsável de um formulário
--  - rotate_enabled = false -> devolve sempre o 1.º utilizador
--  - rotate_enabled = true  -> round-robin entre assigned_user_ids
-- SELECT ... FOR UPDATE evita corridas quando chegam leads em paralelo.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_form_assignee(p_form_id uuid)
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
  FROM public.forms
  WHERE id = p_form_id
  FOR UPDATE;

  IF NOT FOUND OR v_members IS NULL THEN
    RETURN NULL;
  END IF;

  v_count := array_length(v_members, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Sem rotação: entrega sempre ao 1.º utilizador
  IF NOT v_rotate THEN
    RETURN v_members[1];
  END IF;

  v_safe_idx := coalesce(v_idx, 0) % v_count; -- clamp caso a lista tenha encolhido
  v_assigned := v_members[v_safe_idx + 1];    -- arrays PL/pgSQL são 1-based

  UPDATE public.forms
  SET round_robin_index = (v_safe_idx + 1) % v_count
  WHERE id = p_form_id;

  RETURN v_assigned;
END;
$$;
