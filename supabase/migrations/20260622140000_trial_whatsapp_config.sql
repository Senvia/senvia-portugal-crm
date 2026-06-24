-- Make the trial WhatsApp nudge sequence editable from the UI.
--
-- Moves the hardcoded knobs (enabled, threshold/cooldown/cap days) and the
-- message copy out of the function and into a config table, so a super admin can
-- configure / activate / deactivate / edit without a code change. Per-org table
-- (only the Senvia agency row matters for now, since it is the sender of trial
-- nudges). The function defaults to the previous behaviour if no row exists, so
-- this migration is additive and changes nothing about current sending.

CREATE TABLE IF NOT EXISTS public.trial_whatsapp_config (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled         boolean NOT NULL DEFAULT true,
  threshold_days  int     NOT NULL DEFAULT 1,   -- inactivity gap that triggers a nudge
  cooldown_days   int     NOT NULL DEFAULT 2,   -- minimum spacing between nudges
  max_count       int     NOT NULL DEFAULT 4,   -- hard cap per trial
  messages        jsonb   NOT NULL DEFAULT '[]'::jsonb, -- ordered array of templates, {primeiro_nome} placeholder
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Super admins manage it from the System Admin UI. The enqueue function reads it
-- via SECURITY DEFINER, so it does not need a broad read policy.
DROP POLICY IF EXISTS trial_whatsapp_config_super ON public.trial_whatsapp_config;
CREATE POLICY trial_whatsapp_config_super ON public.trial_whatsapp_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Seed the Senvia agency config with the current defaults + copy.
INSERT INTO public.trial_whatsapp_config (organization_id, enabled, threshold_days, cooldown_days, max_count, messages)
VALUES (
  '06fe9e1d-9670-45b0-8717-c5a6e90be380', true, 1, 2, 4,
  jsonb_build_array(
    'Olá {primeiro_nome} 👋 Aqui é a equipa Senvia. Reparámos que ainda não teve oportunidade de explorar a sua conta e queremos ajudar. Em poucos minutos mostro-lhe como trazer os seus contactos e registar a primeira venda. Quer que o ajude por aqui? (Se preferir não receber mensagens, responda SAIR.)',
    'Olá {primeiro_nome}, ainda a equipa Senvia 🙂 Sem pressão. Se for mais fácil, posso ligar-lhe e ajudo-o a arrancar em poucos minutos. Qual o melhor dia e hora para uma chamada rápida?',
    'Olá {primeiro_nome}, vi que andou um pouco afastado do Senvia OS. Quer que o ajude a pôr isto a trabalhar para si? Posso ligar hoje, é só dizer-me a hora.',
    'Olá {primeiro_nome}, continuo por aqui para ajudar a aproveitar o seu período de teste. Se quiser que lhe ligue, é só dizer-me a melhor hora.'
  )
)
ON CONFLICT (organization_id) DO NOTHING;

-- Function now reads the config (with safe fallbacks) and substitutes the
-- {primeiro_nome} placeholder with the real first name of whoever registered.
CREATE OR REPLACE FUNCTION public.enqueue_trial_whatsapp_nudges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senvia        uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380';
  v_creator       uuid;
  v_enabled       boolean;
  v_threshold_days int;
  v_cooldown_days  int;
  v_max           int;
  v_messages      jsonb;
  v_threshold     interval;
  v_cooldown      interval;
  r               record;
  v_step          int;
  v_first         text;
  v_template      text;
  v_text          text;
  v_sent          int := 0;
BEGIN
  SELECT enabled, threshold_days, cooldown_days, max_count, messages
    INTO v_enabled, v_threshold_days, v_cooldown_days, v_max, v_messages
  FROM trial_whatsapp_config
  WHERE organization_id = v_senvia;

  IF NOT FOUND THEN
    v_enabled := true; v_threshold_days := 1; v_cooldown_days := 2; v_max := 4; v_messages := '[]'::jsonb;
  END IF;

  IF NOT v_enabled THEN RETURN 0; END IF;
  IF v_messages IS NULL OR jsonb_array_length(v_messages) = 0 THEN RETURN 0; END IF;

  v_threshold := make_interval(days => GREATEST(v_threshold_days, 0));
  v_cooldown  := make_interval(days => GREATEST(v_cooldown_days, 0));

  SELECT user_id INTO v_creator
  FROM organization_members
  WHERE organization_id = v_senvia AND role = 'admin' AND is_active
  ORDER BY joined_at LIMIT 1;
  IF v_creator IS NULL THEN RETURN 0; END IF;

  FOR r IN
    SELECT o.id, o.contact_phone, COALESCE(o.wa_nudge_count, 0) AS cnt,
      (SELECT p.full_name FROM organization_members m JOIN profiles p ON p.id = m.user_id
        WHERE m.organization_id = o.id AND m.role = 'admin' AND m.is_active
        ORDER BY m.joined_at LIMIT 1) AS owner_name
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
  LOOP
    v_step := r.cnt + 1;
    v_first := NULLIF(split_part(btrim(COALESCE(r.owner_name, '')), ' ', 1), '');
    v_template := v_messages ->> (LEAST(v_step, jsonb_array_length(v_messages)) - 1);
    IF v_template IS NULL OR v_template = '' THEN CONTINUE; END IF;

    IF v_first IS NOT NULL THEN
      v_text := replace(v_template, '{primeiro_nome}', v_first);
    ELSE
      -- No name on record: drop the placeholder (and a leading space) gracefully.
      v_text := replace(replace(v_template, ' {primeiro_nome}', ''), '{primeiro_nome}', '');
    END IF;

    INSERT INTO scheduled_messages (organization_id, created_by, phone, content, send_at, status)
    VALUES (v_senvia, v_creator, r.contact_phone, v_text, now(), 'pending');

    UPDATE organizations
       SET wa_nudge_count = v_step, wa_nudge_last_sent_at = now()
     WHERE id = r.id;

    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;
