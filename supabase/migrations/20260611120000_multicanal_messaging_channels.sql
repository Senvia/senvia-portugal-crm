-- Multicanal (WhatsApp/Instagram/Facebook via Chatwoot + Evolution) — Fase 1
-- Each organization gets its own Chatwoot account; each channel is one row in messaging_channels.

-- 1) Per-org Chatwoot account mapping (1 Chatwoot account per organization)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS chatwoot_account_id INTEGER,
  ADD COLUMN IF NOT EXISTS chatwoot_account_token TEXT;

-- 2) Messaging channels table (1 row per channel per organization)
CREATE TABLE public.messaging_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,                 -- 'whatsapp' | 'instagram' | 'facebook'
  provider TEXT NOT NULL,                     -- 'evolution' | 'meta'
  evolution_instance TEXT,                    -- Evolution instance name
  chatwoot_inbox_id INTEGER,                  -- inbox created in Chatwoot
  status TEXT NOT NULL DEFAULT 'disconnected',-- 'disconnected' | 'connecting' | 'connected' | 'error'
  phone_number TEXT,                          -- filled once connected
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_org_channel UNIQUE(organization_id, channel_type)
);

CREATE INDEX idx_messaging_channels_organization_id ON public.messaging_channels(organization_id);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER update_messaging_channels_updated_at
  BEFORE UPDATE ON public.messaging_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.messaging_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as public.forms)
CREATE POLICY "Users view org messaging channels"
  ON public.messaging_channels FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins manage org messaging channels"
  ON public.messaging_channels FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admin full access messaging channels"
  ON public.messaging_channels FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
