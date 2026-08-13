-- Arquivo do histórico do Chatwoot, para o CRM deixar de depender dele.
--
-- O problema que isto resolve: a lista de conversas do CRM nunca leu da nossa
-- base de dados — ia buscá-la ao vivo à API do Chatwoot. Em `inbox_messages`
-- temos 670 linhas de 30/06 a 11/07/2026; tudo o resto, de cinco organizações,
-- existe só no servidor do Chatwoot. Desligar esse contentor, hoje, levava o
-- histórico todo com ele.
--
-- Guarda-se também o JSON original de cada linha (`raw`). Se eu mapear um campo
-- mal, ou se um dia fizer falta algo que hoje não parece importante, está lá —
-- um arquivo que perde informação ao arquivar não é um arquivo.

CREATE TABLE IF NOT EXISTS public.chatwoot_archive_conversations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chatwoot_account_id      INTEGER NOT NULL,
  chatwoot_conversation_id BIGINT  NOT NULL,
  chatwoot_inbox_id        BIGINT,
  channel_type             TEXT,
  contact_name             TEXT,
  contact_phone            TEXT,
  contact_email            TEXT,
  status                   TEXT,
  message_count            INTEGER NOT NULL DEFAULT 0,
  started_at               TIMESTAMPTZ,
  last_activity_at         TIMESTAMPTZ,
  raw                      JSONB,
  imported_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chatwoot_account_id, chatwoot_conversation_id)
);

CREATE TABLE IF NOT EXISTS public.chatwoot_archive_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES public.chatwoot_archive_conversations(id) ON DELETE CASCADE,
  chatwoot_message_id BIGINT NOT NULL,
  direction           TEXT,
  content             TEXT,
  sender_name         TEXT,
  message_type        TEXT,
  is_private          BOOLEAN NOT NULL DEFAULT false,
  attachments         JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at             TIMESTAMPTZ,
  raw                 JSONB,
  UNIQUE (conversation_id, chatwoot_message_id)
);

CREATE INDEX IF NOT EXISTS idx_arq_conv_org
  ON public.chatwoot_archive_conversations (organization_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_arq_conv_contacto
  ON public.chatwoot_archive_conversations (organization_id, contact_phone);
CREATE INDEX IF NOT EXISTS idx_arq_msg_conv
  ON public.chatwoot_archive_messages (conversation_id, sent_at);

ALTER TABLE public.chatwoot_archive_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_archive_messages      ENABLE ROW LEVEL SECURITY;

-- Só leitura para os membros da organização. Ninguém escreve daqui: quem
-- preenche é o exportador, com service_role. Um arquivo que se possa editar
-- pela interface deixa de ser prova de nada.
CREATE POLICY arq_conv_select ON public.chatwoot_archive_conversations
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY arq_msg_select ON public.chatwoot_archive_messages
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

-- Estado da exportação, para se saber o que já veio e o que falta — e para
-- poder recomeçar de onde parou sem repetir tudo.
CREATE TABLE IF NOT EXISTS public.chatwoot_archive_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  chatwoot_account_id INTEGER,
  status              TEXT NOT NULL DEFAULT 'running',
  conversations_seen  INTEGER NOT NULL DEFAULT 0,
  messages_saved      INTEGER NOT NULL DEFAULT 0,
  last_page           INTEGER NOT NULL DEFAULT 0,
  error               TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ
);
ALTER TABLE public.chatwoot_archive_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY arq_runs_select ON public.chatwoot_archive_runs
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
