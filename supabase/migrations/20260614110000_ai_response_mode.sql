-- First-contact AI auto-reply mode, per organization.
--   'global'   -> a single org-level config (rules + hot/warm/cold templates)
--                 applies to every native SENVIA OS form.
--   'per_form' -> each form defines its own rules + templates (in the form
--                 editor's Automação section); no org-level fallback.
-- Defaults to 'global' so existing org-level templates keep working.
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS ai_response_mode text NOT NULL DEFAULT 'global';

COMMENT ON COLUMN public.organizations.ai_response_mode IS
  'First-contact AI auto-reply mode: global (org-level config for all forms) or per_form (each form configures its own).';
