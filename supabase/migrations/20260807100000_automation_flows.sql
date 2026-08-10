-- FASE 1 — fluxos de automação com nós ligados.
--
-- O que existia: uma "automação" era um template de email com um gatilho
-- carimbado por cima (email_templates.automation_*). Um passo, um canal, sem
-- estado, sem histórico. Isto acrescenta fluxos com vários passos, esperas,
-- ramos e WhatsApp — e, sobretudo, EXECUÇÃO COM ESTADO, para o modelo
-- conversacional: enviar, esperar a resposta, ramificar conforme o que a
-- pessoa escreveu.
--
-- Três tabelas:
--   automation_flows      — o desenho (grafo de nós e ligações)
--   automation_runs       — cada contacto que está a percorrer um fluxo
--   automation_run_steps  — o que aconteceu em cada passo (observabilidade)
--
-- O histórico não é opcional: os incidentes deste projeto (webhook do Stripe,
-- automações a 401) foram todos invisíveis por falta de registo. Aqui nasce com
-- a funcionalidade.

-- =====================================================================
-- 1. FLOWS — o desenho
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.automation_flows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,

  -- draft: nunca inscreve ninguém. active: a correr. paused: mantém percursos
  -- em curso mas deixa de inscrever contactos novos.
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused')),

  trigger_type      text NOT NULL,
  trigger_config    jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- { nodes: [{id, type, config, position}], edges: [{id, source, target, branch}] }
  graph             jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  entry_node_id     text,

  -- Sobe a cada publicação. Percursos em curso guardam a versão com que
  -- entraram, para uma edição a meio não os fazer saltar para um nó que já não
  -- existe.
  version           integer NOT NULL DEFAULT 1,

  -- once: um contacto só entra uma vez, para sempre.
  -- after_completion: pode voltar a entrar depois de terminar.
  -- always: entra sempre que o gatilho dispara.
  reentry_policy    text NOT NULL DEFAULT 'once'
                    CHECK (reentry_policy IN ('once', 'after_completion', 'always')),

  -- Travões que valem para o fluxo inteiro. quiet_hours: {start:'21:00', end:'09:00'}
  quiet_hours       jsonb,
  max_steps_per_run integer NOT NULL DEFAULT 100,

  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_enrolled_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_flows_org ON public.automation_flows (organization_id);
-- O despacho procura sempre por (org, gatilho) entre os fluxos ativos.
CREATE INDEX IF NOT EXISTS idx_flows_active_trigger
  ON public.automation_flows (organization_id, trigger_type)
  WHERE status = 'active';

-- =====================================================================
-- 2. RUNS — cada contacto a percorrer um fluxo
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id           uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  flow_version      integer NOT NULL DEFAULT 1,

  -- Quem está a percorrer. subject_id é a lead/cliente/venda de origem.
  subject_type      text NOT NULL DEFAULT 'lead'
                    CHECK (subject_type IN ('lead', 'client', 'sale', 'contact', 'organization')),
  subject_id        uuid,

  -- Desnormalizado: é por aqui que se envia e que se faz a correspondência de
  -- uma mensagem recebida com o percurso que está à espera dela.
  contact_name      text,
  contact_email     text,
  contact_phone     text,
  -- Só dígitos, para a correspondência não falhar por causa de espaços/+351.
  contact_phone_key text,

  -- running        — a executar agora
  -- waiting        — parado numa espera de tempo (wake_at diz quando acorda)
  -- awaiting_reply — parado à espera de uma resposta do contacto (o coração do
  --                  modelo conversacional); wake_at é o limite de tempo
  status            text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'waiting', 'awaiting_reply', 'completed', 'failed', 'cancelled')),

  current_node_id   text,
  wake_at           timestamptz,

  -- Variáveis acumuladas ao longo do percurso ({{nome}}, respostas dadas, etc.)
  context           jsonb NOT NULL DEFAULT '{}'::jsonb,

  steps_taken       integer NOT NULL DEFAULT 0,
  last_error        text,

  started_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

-- O tick do cron: encontrar percursos cuja hora chegou.
CREATE INDEX IF NOT EXISTS idx_runs_wake
  ON public.automation_runs (wake_at)
  WHERE status IN ('waiting', 'awaiting_reply');

-- Chega uma mensagem de WhatsApp: que percurso está à espera deste número?
CREATE INDEX IF NOT EXISTS idx_runs_awaiting_phone
  ON public.automation_runs (organization_id, contact_phone_key)
  WHERE status = 'awaiting_reply';

CREATE INDEX IF NOT EXISTS idx_runs_flow ON public.automation_runs (flow_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_org ON public.automation_runs (organization_id, started_at DESC);

-- Um contacto não pode ter dois percursos ativos no mesmo fluxo. É isto que
-- impede a mesma pessoa de receber a sequência em duplicado quando o gatilho
-- dispara duas vezes seguidas.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_run_per_subject
  ON public.automation_runs (flow_id, subject_id)
  WHERE status IN ('running', 'waiting', 'awaiting_reply') AND subject_id IS NOT NULL;

-- =====================================================================
-- 3. RUN STEPS — o histórico, passo a passo
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.automation_run_steps (
  id              bigserial PRIMARY KEY,
  run_id          uuid NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  node_id         text NOT NULL,
  node_type       text NOT NULL,

  status          text NOT NULL DEFAULT 'ok'
                  CHECK (status IN ('ok', 'skipped', 'failed', 'waiting')),

  -- O que aconteceu: mensagem enviada, ramo escolhido, motivo do salto, erro.
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run ON public.automation_run_steps (run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_run_steps_org_failed
  ON public.automation_run_steps (organization_id, created_at DESC)
  WHERE status = 'failed';

-- Impede o mesmo nó de ser executado duas vezes no mesmo percurso (reentrega,
-- dois ticks em paralelo). O motor apoia-se nisto para ser idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_step_per_run_node
  ON public.automation_run_steps (run_id, node_id)
  WHERE status <> 'failed';

-- =====================================================================
-- 4. RLS — isolamento por organização, como todas as outras tabelas
-- =====================================================================
ALTER TABLE public.automation_flows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_run_steps ENABLE ROW LEVEL SECURITY;

-- Fluxos: membros veem, administradores alteram.
CREATE POLICY "Members view org flows" ON public.automation_flows
  FOR SELECT USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Admins insert org flows" ON public.automation_flows
  FOR INSERT WITH CHECK (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Admins update org flows" ON public.automation_flows
  FOR UPDATE USING (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) WITH CHECK (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Admins delete org flows" ON public.automation_flows
  FOR DELETE USING (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- Percursos e passos: leitura para membros (é o separador Atividade). A
-- escrita é exclusiva do motor, que usa a service-role key e ignora RLS — por
-- isso não há policies de INSERT/UPDATE aqui de propósito.
CREATE POLICY "Members view org runs" ON public.automation_runs
  FOR SELECT USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- Cancelar um percurso a meio é a única escrita que um administrador faz.
CREATE POLICY "Admins cancel org runs" ON public.automation_runs
  FOR UPDATE USING (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) WITH CHECK (
    (public.is_org_member(auth.uid(), organization_id)
     AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Members view org run steps" ON public.automation_run_steps
  FOR SELECT USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- =====================================================================
-- 5. updated_at automático
-- =====================================================================
DROP TRIGGER IF EXISTS trg_automation_flows_updated ON public.automation_flows;
CREATE TRIGGER trg_automation_flows_updated
  BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_automation_runs_updated ON public.automation_runs;
CREATE TRIGGER trg_automation_runs_updated
  BEFORE UPDATE ON public.automation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 6. Normalização de telefone — partilhada entre o motor e o webhook de
--    entrada, para os dois lados da correspondência usarem exatamente a mesma
--    regra. Guarda os últimos 9 dígitos (número nacional PT), o que faz
--    "+351 912 345 678", "00351912345678" e "912345678" coincidirem.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.automation_phone_key(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN p_phone IS NULL THEN NULL
    WHEN length(regexp_replace(p_phone, '\D', '', 'g')) < 9 THEN NULL
    ELSE right(regexp_replace(p_phone, '\D', '', 'g'), 9)
  END;
$$;

COMMENT ON TABLE public.automation_flows IS
  'Desenho de um fluxo de automação (grafo de nós). Um por campanha/sequência.';
COMMENT ON TABLE public.automation_runs IS
  'Percurso de um contacto dentro de um fluxo. status=awaiting_reply é o modelo conversacional: parado à espera do que a pessoa responder.';
COMMENT ON TABLE public.automation_run_steps IS
  'Histórico passo a passo. Responde a "porque é que este contacto recebeu isto?".';
