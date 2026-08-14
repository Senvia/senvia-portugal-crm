-- Auditoria da caixa de Instagram/Messenger: fecha as lacunas encontradas.
--
-- Parte disto é DESVIO DE ESQUEMA: colunas e funções criadas à mão no SQL Editor
-- que nunca chegaram a um ficheiro de migração. Um ambiente novo construído a
-- partir desta pasta não as tinha, e o webhook rebentava em cada reação e em
-- cada registo de diagnóstico. Tudo aqui é idempotente de propósito — corre bem
-- na produção (onde já existe) e num ambiente vazio.

-- ── 1. Colunas do desvio ────────────────────────────────────────────────────

ALTER TABLE public.meta_messages
  ADD COLUMN IF NOT EXISTS reaction              TEXT,
  ADD COLUMN IF NOT EXISTS reaction_by           TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_external_id  TEXT,
  -- Quando a Meta diz que a mensagem foi enviada, não quando a recebemos. Uma
  -- reentrega atrasada punha a mensagem no sítio errado da conversa, porque a
  -- ordenação era pelo created_at do nosso insert.
  ADD COLUMN IF NOT EXISTS sent_at               TIMESTAMPTZ;

UPDATE public.meta_messages SET sent_at = created_at WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.meta_webhook_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method      TEXT,
  valid_sig   BOOLEAN,
  body_head   TEXT,
  note        TEXT
);
ALTER TABLE public.meta_webhook_log ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só o service_role. É um registo entre organizações.

-- Sem isto, o suporte não consegue responder à única pergunta que interessa
-- quando um cliente diz "não recebo mensagens": a Meta chegou a chamar-nos por
-- causa DESTA página, e o que é que nós fizemos com o evento?
ALTER TABLE public.meta_webhook_log
  ADD COLUMN IF NOT EXISTS page_id         TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS outcome         TEXT;

CREATE INDEX IF NOT EXISTS idx_meta_webhook_log_received
  ON public.meta_webhook_log (received_at DESC);

-- ── 2. Registo dos pedidos de eliminação (RGPD) ─────────────────────────────
--
-- O endpoint devolvia à Meta um código de confirmação sem guardar o que tinha
-- (ou não tinha) apagado. Estas colunas são a prova.

ALTER TABLE public.meta_data_deletion_requests
  ADD COLUMN IF NOT EXISTS status                TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deleted_conversations INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_messages      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error                 TEXT,
  ADD COLUMN IF NOT EXISTS processed_at          TIMESTAMPTZ;

-- ── 3. Índices para as consultas que o webhook faz mesmo ────────────────────
--
-- Cada mensagem recebida procurava o canal por page_id e por ig_account_id sem
-- índice nenhum: duas varreduras completas da tabela por evento.

CREATE INDEX IF NOT EXISTS idx_messaging_channels_page_id
  ON public.messaging_channels ((metadata->>'page_id'));
CREATE INDEX IF NOT EXISTS idx_messaging_channels_ig_account
  ON public.messaging_channels ((metadata->>'ig_account_id'));

-- As reações chegam pelo `mid` da mensagem. O único índice existente é
-- (conversation_id, external_id) e não serve uma procura só por external_id.
CREATE INDEX IF NOT EXISTS idx_meta_messages_external
  ON public.meta_messages (external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_conv_channel_recent
  ON public.meta_conversations (channel_id, last_message_at DESC);

-- ── 4. Uma Página não pode servir duas organizações ─────────────────────────
--
-- O webhook resolve o canal por page_id e devolve UMA linha. Com a mesma Página
-- ligada em duas organizações, as mensagens de uma iam parar à outra — uma falha
-- de isolamento que o RLS não apanha, porque quem escreve é o service_role.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_meta_page_por_tipo
  ON public.messaging_channels ((metadata->>'page_id'), channel_type)
  WHERE provider = 'meta' AND metadata->>'page_id' IS NOT NULL;

-- ── 5. increment_meta_unread: só o servidor ─────────────────────────────────
--
-- É SECURITY DEFINER e o Postgres dá EXECUTE ao PUBLIC por omissão: qualquer
-- utilizador autenticado com o UUID de uma conversa podia inflacionar-lhe o
-- contador. Quem a chama é o webhook, com service_role.

CREATE OR REPLACE FUNCTION public.increment_meta_unread(_conversation_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.meta_conversations
     SET unread_count = unread_count + 1
   WHERE id = _conversation_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_meta_unread(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_meta_unread(UUID) FROM authenticated, anon;

-- ── 6. Marcar como lido sem perder incrementos ──────────────────────────────
--
-- O CRM escrevia `unread_count = 0`. Uma mensagem que chegasse entre a leitura e
-- essa escrita tinha o incremento deitado fora. Descontar só o que foi visto
-- resolve a corrida.

CREATE OR REPLACE FUNCTION public.mark_meta_read(_conversation_id UUID, _seen INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.meta_conversations
     SET unread_count = GREATEST(0, unread_count - GREATEST(_seen, 0))
   WHERE id = _conversation_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_meta_read(UUID, INTEGER) TO authenticated;

-- ── 7. Retenção do registo de diagnóstico ───────────────────────────────────
--
-- Guarda os primeiros 800 caracteres do corpo — texto real de mensagens de
-- clientes. Sem prazo, era um arquivo permanente de dados pessoais entre
-- organizações, fora do alcance do pedido de eliminação da Meta.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('meta-webhook-log-retencao')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meta-webhook-log-retencao');
    PERFORM cron.schedule(
      'meta-webhook-log-retencao',
      '17 4 * * *',
      $cron$DELETE FROM public.meta_webhook_log WHERE received_at < now() - interval '14 days'$cron$
    );
  END IF;
END $$;

-- ── 8. Campos que o webhook passou a guardar ────────────────────────────────

ALTER TABLE public.meta_messages
  -- Mensagem retirada pela pessoa. Ficava visível no CRM depois de apagada.
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.meta_conversations
  -- De onde veio a conversa: anúncio (ad_id), link ig.me com ?ref=, botão.
  -- É o que liga uma DM à campanha que a pagou.
  ADD COLUMN IF NOT EXISTS source_ref   JSONB,
  -- Seguidores, verificado, segue-nos. Qualifica o contacto sem custo extra:
  -- vem no mesmo pedido de perfil que já era feito.
  ADD COLUMN IF NOT EXISTS contact_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_meta_msg_conv_sent
  ON public.meta_messages (conversation_id, sent_at DESC);
