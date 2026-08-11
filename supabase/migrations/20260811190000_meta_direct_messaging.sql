-- Instagram e Messenger ligados DIRETO à Meta, sem Chatwoot.
--
-- Porquê tabelas novas em vez de reaproveitar inbox_messages: aquela é moldada
-- ao WhatsApp via Chatwoot — `phone` é obrigatório e há ids do Chatwoot lá
-- dentro. No Instagram a pessoa do outro lado não tem telefone nenhum: tem um
-- IGSID (no Messenger, um PSID). Enfiar isso numa coluna chamada `phone` era
-- mentir sobre o que lá está guardado.

-- ── Conversas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id         UUID NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,

  -- O identificador da pessoa NA PLATAFORMA (IGSID no Instagram, PSID no
  -- Messenger). É por org/app: o mesmo humano tem ids diferentes em apps
  -- diferentes, por isso não serve para cruzar com nada fora daqui.
  contact_ref        TEXT NOT NULL,
  contact_name       TEXT,
  contact_avatar_url TEXT,

  -- Ligação ao CRM, quando se consegue identificar quem é.
  lead_id            UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id          UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,

  last_message       TEXT,
  last_message_at    TIMESTAMPTZ,
  unread_count       INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'open',
  assigned_to        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Até quando se pode responder. A Meta só permite responder dentro de 24h
  -- desde a última mensagem DA PESSOA; passado isso, a API recusa. Guardar o
  -- prazo é o que permite avisar antes de se tentar, em vez de descobrir com um
  -- erro depois de escrever a resposta.
  window_expires_at  TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma conversa por pessoa por caixa.
  UNIQUE (channel_id, contact_ref)
);

CREATE INDEX IF NOT EXISTS idx_meta_conv_org_recent
  ON public.meta_conversations (organization_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_meta_conv_channel
  ON public.meta_conversations (channel_id);

-- ── Mensagens ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES public.meta_conversations(id) ON DELETE CASCADE,

  -- O id da mensagem na Meta. Os webhooks são entregues PELO MENOS uma vez, por
  -- isso a mesma mensagem chega repetida com alguma frequência; o índice único
  -- é o que impede que apareça duas vezes na conversa.
  external_id      TEXT,

  direction        TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content          TEXT,
  attachments      JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Quem respondeu do nosso lado (nulo nas recebidas).
  sent_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_meta_message_external
  ON public.meta_messages (conversation_id, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_msg_conversation
  ON public.meta_messages (conversation_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesmo padrão do resto do CRM: só membros da organização.
ALTER TABLE public.meta_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meta_conversations_member ON public.meta_conversations;
CREATE POLICY meta_conversations_member ON public.meta_conversations
  FOR ALL USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS meta_messages_member ON public.meta_messages;
CREATE POLICY meta_messages_member ON public.meta_messages
  FOR ALL USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- O webhook escreve com service_role, que ignora RLS — não precisa de política.
