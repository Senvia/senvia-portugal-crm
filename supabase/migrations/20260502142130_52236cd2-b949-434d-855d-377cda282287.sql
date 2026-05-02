ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS webhook_token_dedicated text UNIQUE,
  ADD COLUMN IF NOT EXISTS webhook_dedicated_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_organizations_webhook_token_dedicated
  ON public.organizations(webhook_token_dedicated)
  WHERE webhook_token_dedicated IS NOT NULL;