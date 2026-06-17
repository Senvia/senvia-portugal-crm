-- Marca quando um novo trial já foi notificado à equipa SENVIA (cria lead +
-- email de alerta). Usado pela edge function notify-new-trials para ser
-- idempotente — cada org só gera UMA notificação/lead, mesmo que o cron corra
-- várias vezes.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_notified_at timestamptz;

COMMENT ON COLUMN public.organizations.trial_notified_at IS
  'Quando a equipa SENVIA foi notificada deste novo trial (lead criado + email). NULL = ainda por notificar.';
