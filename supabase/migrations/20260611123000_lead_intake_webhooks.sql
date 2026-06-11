-- ============================================================================
-- Lead Intake Webhooks
-- Permite a cada organização criar vários webhooks de ENTRADA (receber leads),
-- com nome próprio, lista de utilizadores que recebem os leads e distribuição
-- rotativa (round-robin) opcional por webhook.
--
-- Substitui a lógica antiga baseada em organizations.webhook_token (geral) e
-- organizations.webhook_token_dedicated (1 utilizador fixo): ambos são migrados
-- para registos desta tabela, REUTILIZANDO o mesmo token — por isso os URLs
-- existentes no Zapier/Make NÃO mudam.
-- ============================================================================

CREATE TABLE public.lead_intake_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  -- Registos de sistema (Principal/Dedicado migrados): editáveis mas não apagáveis
  is_system boolean NOT NULL DEFAULT false,
  -- Utilizadores que recebem os leads deste webhook
  assigned_user_ids uuid[] NOT NULL DEFAULT '{}',
  -- Distribuição rotativa (round-robin) entre os utilizadores selecionados.
  -- Quando false, todos os leads vão para o 1.º utilizador da lista.
  rotate_enabled boolean NOT NULL DEFAULT false,
  -- Cursor do round-robin (por webhook)
  round_robin_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_intake_webhooks_org
  ON public.lead_intake_webhooks(organization_id);
CREATE INDEX idx_lead_intake_webhooks_token
  ON public.lead_intake_webhooks(token);

-- updated_at automático
CREATE TRIGGER update_lead_intake_webhooks_updated_at
  BEFORE UPDATE ON public.lead_intake_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS — mesmo padrão de organization_webhooks
-- ============================================================================
ALTER TABLE public.lead_intake_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org lead webhooks"
ON public.lead_intake_webhooks
FOR SELECT
USING (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert org lead webhooks"
ON public.lead_intake_webhooks
FOR INSERT
WITH CHECK (
  (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role) AND is_system = false)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins update org lead webhooks"
ON public.lead_intake_webhooks
FOR UPDATE
USING (
  (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Apenas registos não-sistema podem ser apagados
CREATE POLICY "Admins delete org lead webhooks"
ON public.lead_intake_webhooks
FOR DELETE
USING (
  (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role) AND is_system = false)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- ============================================================================
-- RPC atómico: próximo responsável de um webhook de entrada
--  - rotate_enabled = false  -> devolve sempre o 1.º utilizador
--  - rotate_enabled = true   -> round-robin entre assigned_user_ids
-- Usa SELECT ... FOR UPDATE para evitar corridas quando chegam leads em paralelo.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_webhook_assignee(p_webhook_id uuid)
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
  FROM public.lead_intake_webhooks
  WHERE id = p_webhook_id
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

  UPDATE public.lead_intake_webhooks
  SET round_robin_index = (v_safe_idx + 1) % v_count
  WHERE id = p_webhook_id;

  RETURN v_assigned;
END;
$$;

-- ============================================================================
-- BACKFILL — migrar os webhooks existentes (reutilizando o mesmo token)
-- ============================================================================

-- 1) Webhook Geral (round-robin pela equipa) -> registo "Webhook Principal"
INSERT INTO public.lead_intake_webhooks
  (organization_id, name, token, is_active, is_system, assigned_user_ids, rotate_enabled, round_robin_index)
SELECT
  o.id,
  'Webhook Principal',
  o.webhook_token::text,
  true,
  true,
  COALESCE(
    (SELECT array_agg(om.user_id ORDER BY om.joined_at ASC)
     FROM public.organization_members om
     WHERE om.organization_id = o.id AND om.is_active = true),
    '{}'::uuid[]
  ),
  COALESCE((o.sales_settings->>'auto_assign_leads')::boolean, false),
  COALESCE((o.sales_settings->>'round_robin_index')::integer, 0)
FROM public.organizations o
WHERE o.webhook_token IS NOT NULL
ON CONFLICT (token) DO NOTHING;

-- 2) Webhook Dedicado (1 utilizador fixo) -> registo "Webhook Dedicado"
INSERT INTO public.lead_intake_webhooks
  (organization_id, name, token, is_active, is_system, assigned_user_ids, rotate_enabled, round_robin_index)
SELECT
  o.id,
  'Webhook Dedicado',
  o.webhook_token_dedicated,
  true,
  true,
  CASE
    WHEN o.webhook_dedicated_user_id IS NOT NULL THEN ARRAY[o.webhook_dedicated_user_id]
    ELSE '{}'::uuid[]
  END,
  false,
  0
FROM public.organizations o
WHERE o.webhook_token_dedicated IS NOT NULL
ON CONFLICT (token) DO NOTHING;

-- ============================================================================
-- TRIGGER — orgs novas recebem automaticamente um "Webhook Principal"
-- (reutiliza o webhook_token gerado por defeito na organização)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_default_lead_intake_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.webhook_token IS NOT NULL THEN
    INSERT INTO public.lead_intake_webhooks
      (organization_id, name, token, is_active, is_system, assigned_user_ids, rotate_enabled)
    VALUES
      (NEW.id, 'Webhook Principal', NEW.webhook_token::text, true, true, '{}'::uuid[], false)
    ON CONFLICT (token) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_default_lead_intake_webhook
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_lead_intake_webhook();
