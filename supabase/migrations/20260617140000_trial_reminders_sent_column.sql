-- Cria a coluna organizations.trial_reminders_sent que o cron check-trial-status
-- lê e escreve mas que NUNCA foi criada na base de dados. Sem ela, o SELECT do
-- cron falhava e NENHUM email do ciclo de trial era enviado.
--
-- Além de criar a coluna, silencia os trials JÁ EXPIRADOS — marca todos os flags
-- como enviados — para que, quando o cron passar a funcionar, não dispare emails
-- retroativos (boas-vindas, dia 3/7, fim de trial) a contas que já terminaram.
-- Trials ainda ativos ficam com '{}' e recebem a sequência normalmente.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_reminders_sent jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.trial_reminders_sent IS
  'Flags de quais emails do ciclo de trial já foram disparados pelo cron check-trial-status (automation_started/day3/day7/3d/1d/expired), para envio único.';

UPDATE public.organizations
SET trial_reminders_sent = '{"automation_started":true,"automation_day3":true,"automation_day7":true,"automation_3d":true,"automation_1d":true,"automation_expired":true}'::jsonb
WHERE COALESCE(billing_exempt, false) = false
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at < now();
