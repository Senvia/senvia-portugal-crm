-- ============================================================================
-- Webhooks de entrada: toggle "notificar todos os administradores"
-- ----------------------------------------------------------------------------
-- Problema: a edge function submit-lead notificava SEMPRE todos os admins da org
-- (email + push) em qualquer webhook, ignorando a lista "Quem recebe os leads".
-- Resultado: um admin que se desmarcava da rotacao continuava a receber os avisos.
--
-- Solucao: flag por webhook. true (default) mantem o comportamento atual; false
-- faz a notificacao seguir a selecao (so quem recebe o lead e' notificado).
-- Default true => nenhuma org existente muda de comportamento sem opt-in.
-- ============================================================================

ALTER TABLE public.lead_intake_webhooks
  ADD COLUMN IF NOT EXISTS notify_all_admins boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.lead_intake_webhooks.notify_all_admins IS
  'Se true (default), todos os admins da org recebem email/push de cada lead deste webhook. Se false, so o utilizador a quem o lead foi atribuido e'' notificado.';
