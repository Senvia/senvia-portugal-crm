-- Trial WhatsApp re-engagement nudges (gap-based).
--
-- Sends a gentle WhatsApp sequence to trials that signed up but stopped using
-- the system. The trigger is an INACTIVITY GAP, not a fixed trial day: whenever
-- the org goes >= 1 day without activity (last_active_at), it gets a nudge; if it
-- comes back and goes quiet again, the gap re-triggers. A cooldown spaces the
-- messages and a hard cap keeps it gentle (WhatsApp ban-safety).
--
-- Delivery reuses the existing pipeline: this just INSERTs into scheduled_messages
-- (org = Senvia agency), and the already-deployed send-scheduled-messages cron
-- delivers via the Senvia Evolution instance. Replies land in the Senvia inbox,
-- so a human can take over. No new edge function needed.
--
-- Eligibility: not exempt, not paid (first_paid_at null), trial still running,
-- inactive >= 1 day, has a phone, not opted out, under the message cap.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS wa_nudge_count        int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wa_nudge_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_nudge_optout       boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.wa_nudge_count IS
  'Number of trial re-engagement WhatsApp nudges already sent (caps the sequence).';
COMMENT ON COLUMN public.organizations.wa_nudge_last_sent_at IS
  'When the last WhatsApp nudge was sent (enforces the cooldown between messages).';
COMMENT ON COLUMN public.organizations.wa_nudge_optout IS
  'Set true to stop WhatsApp nudges for this org (e.g. the user replied SAIR).';

-- Enqueues due nudges. Returns how many were queued. Safe to run repeatedly:
-- idempotency comes from the cooldown + per-org count, not from when it runs.
CREATE OR REPLACE FUNCTION public.enqueue_trial_whatsapp_nudges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senvia    uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380'; -- Senvia agency org
  v_creator   uuid;
  v_threshold interval := interval '1 day';  -- inactivity gap that triggers a nudge
  v_cooldown  interval := interval '2 days'; -- minimum spacing between nudges
  v_max       int := 4;                      -- hard cap of nudges per trial
  r           record;
  v_step      int;
  v_first     text;
  v_greet     text;
  v_text      text;
  v_sent      int := 0;
BEGIN
  -- scheduled_messages.created_by is NOT NULL; use a Senvia admin as the author.
  SELECT user_id INTO v_creator
  FROM organization_members
  WHERE organization_id = v_senvia AND role = 'admin' AND is_active
  ORDER BY joined_at
  LIMIT 1;
  IF v_creator IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT o.id, o.contact_phone, COALESCE(o.wa_nudge_count, 0) AS cnt,
      (SELECT p.full_name
         FROM organization_members m
         JOIN profiles p ON p.id = m.user_id
        WHERE m.organization_id = o.id AND m.role = 'admin' AND m.is_active
        ORDER BY m.joined_at
        LIMIT 1) AS owner_name
    FROM organizations o
    WHERE COALESCE(o.billing_exempt, false) = false
      AND o.first_paid_at IS NULL
      AND (o.plan IS NULL OR o.plan = 'basic')
      AND o.trial_ends_at > now()
      AND o.contact_phone IS NOT NULL AND o.contact_phone <> ''
      AND COALESCE(o.wa_nudge_optout, false) = false
      AND COALESCE(o.wa_nudge_count, 0) < v_max
      AND COALESCE(o.last_active_at, o.created_at) <= now() - v_threshold
      AND (o.wa_nudge_last_sent_at IS NULL OR o.wa_nudge_last_sent_at <= now() - v_cooldown)
      -- Exclude contacts marked as lost/perdido/churned in leads
      AND o.contact_phone NOT IN (
        SELECT phone FROM leads
        WHERE phone IS NOT NULL AND phone <> ''
          AND status IN ('lost', 'perdido', 'churned')
      )
  LOOP
    v_step := r.cnt + 1;
    -- Real first name of the person who registered (profiles.full_name of the
    -- org's admin). NEVER a literal placeholder: if there is no name on record,
    -- the greeting gracefully drops to just "Olá".
    v_first := NULLIF(split_part(btrim(COALESCE(r.owner_name, '')), ' ', 1), '');
    v_greet := CASE WHEN v_first IS NOT NULL THEN 'Olá ' || v_first ELSE 'Olá' END;

    v_text := CASE LEAST(v_step, 4)
      WHEN 1 THEN format('%s 👋 Aqui é a equipa Senvia. Reparámos que ainda não teve oportunidade de explorar a sua conta e queremos ajudar. Em poucos minutos mostro-lhe como trazer os seus contactos e registar a primeira venda. Quer que o ajude por aqui? (Se preferir não receber mensagens, responda SAIR.)', v_greet)
      WHEN 2 THEN format('%s, ainda a equipa Senvia 🙂 Sem pressão. Se for mais fácil, posso ligar-lhe e ajudo-o a arrancar em poucos minutos. Qual o melhor dia e hora para uma chamada rápida?', v_greet)
      WHEN 3 THEN format('%s, vi que andou um pouco afastado do Senvia OS. Quer que o ajude a pôr isto a trabalhar para si? Posso ligar hoje, é só dizer-me a hora.', v_greet)
      ELSE       format('%s, continuo por aqui para ajudar a aproveitar o seu período de teste. Se quiser que lhe ligue, é só dizer-me a melhor hora.', v_greet)
    END;

    INSERT INTO scheduled_messages (organization_id, created_by, phone, content, send_at, status)
    VALUES (v_senvia, v_creator, r.contact_phone, v_text, now(), 'pending');

    UPDATE organizations
       SET wa_nudge_count = v_step,
           wa_nudge_last_sent_at = now()
     WHERE id = r.id;

    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;
