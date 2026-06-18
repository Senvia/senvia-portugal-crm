-- Inbox (caixa de entrada) limits per subscription plan + per-org override + DB enforcement.
--
-- A "caixa" is a multichannel inbox (a row in messaging_channels: WhatsApp,
-- Instagram, Facebook, Email, ...). Until now there was no cap on how many a
-- plan could create. This adds:
--   1. subscription_plans.max_inboxes   (NULL = unlimited)
--   2. organizations.max_inboxes_override (NULL = use plan limit; mirrors the
--      existing max_users_override pattern)
--   3. a BEFORE INSERT trigger on messaging_channels that enforces the effective
--      limit (override > plan; billing-exempt orgs bypass).

-- 1. Plan column + values --------------------------------------------------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_inboxes integer;

UPDATE public.subscription_plans SET max_inboxes = 2    WHERE id = 'starter';
UPDATE public.subscription_plans SET max_inboxes = 10   WHERE id = 'pro';
UPDATE public.subscription_plans SET max_inboxes = NULL WHERE id = 'elite'; -- ilimitado

-- 2. Per-org override (mirror of max_users_override) ------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_inboxes_override integer;

-- 3. Enforcement trigger ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_inbox_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan      text;
  v_override  integer;
  v_exempt    boolean;
  v_max       integer;
  v_count     integer;
BEGIN
  SELECT plan, max_inboxes_override, COALESCE(billing_exempt, false)
    INTO v_plan, v_override, v_exempt
    FROM public.organizations
    WHERE id = NEW.organization_id;

  -- Billing-exempt orgs (demos, internal, partners) skip all limits.
  IF v_exempt THEN
    RETURN NEW;
  END IF;

  SELECT max_inboxes INTO v_max
    FROM public.subscription_plans
    WHERE id = COALESCE(v_plan, 'starter');

  -- Effective limit: a per-org override always wins; NULL means unlimited.
  v_max := COALESCE(v_override, v_max);
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.messaging_channels
    WHERE organization_id = NEW.organization_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'INBOX_LIMIT_REACHED: Limite de % caixas de entrada atingido para o plano %.',
      v_max, COALESCE(v_plan, 'starter')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inbox_limit ON public.messaging_channels;
CREATE TRIGGER trg_enforce_inbox_limit
  BEFORE INSERT ON public.messaging_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inbox_limit();
