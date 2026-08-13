-- WhatsApp pela Cloud API oficial da Meta.
--
-- Reaproveita tudo o que já existe: as conversas e as mensagens vivem nas mesmas
-- tabelas do Instagram e do Messenger (meta_conversations / meta_messages), o
-- webhook é o mesmo endereço e o cliente na Caixa de Entrada é o mesmo. O que
-- muda é a identificação do canal e a forma do que se envia.
--
-- Nota sobre o `channel_type`: continua a ser 'whatsapp', como as caixas antigas
-- do Evolution. Distinguem-se pelo `provider` — 'meta' para esta, 'evolution'
-- para as antigas. É o que permite as duas coexistirem enquanto se migra.

-- ── Estados de entrega ──────────────────────────────────────────────────────
--
-- O WhatsApp diz o que aconteceu a cada mensagem que enviamos: entregue, lida,
-- falhada. O Instagram e o Messenger não dão isto — é a diferença que justifica
-- a coluna. Sem ela, o agente não sabe se a mensagem sequer chegou ao telemóvel.

ALTER TABLE public.meta_messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at         TIMESTAMPTZ,
  -- Porque falhou, quando falha. A Meta manda um código e uma descrição; sem
  -- guardar, resta ao suporte adivinhar entre "número inválido", "fora da
  -- janela" e "modelo não aprovado".
  ADD COLUMN IF NOT EXISTS delivery_error  TEXT;

-- Os estados chegam por `wamid`, que é o `external_id` da mensagem enviada.
CREATE INDEX IF NOT EXISTS idx_meta_msg_external_org
  ON public.meta_messages (organization_id, external_id)
  WHERE external_id IS NOT NULL;

-- ── Encontrar o canal pelo número ───────────────────────────────────────────
--
-- Cada mensagem recebida traz o `phone_number_id` da conta que a recebeu. É por
-- aí que se descobre a que caixa pertence — como o `page_id` no Messenger.

CREATE INDEX IF NOT EXISTS idx_messaging_channels_phone_number_id
  ON public.messaging_channels ((metadata->>'phone_number_id'));

-- Uma conta de WhatsApp não pode servir duas organizações, pela mesma razão do
-- Instagram: o webhook resolve por este id e devolve UMA linha.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_phone_number_id
  ON public.messaging_channels ((metadata->>'phone_number_id'))
  WHERE provider = 'meta' AND metadata->>'phone_number_id' IS NOT NULL;

-- ── Modelos de mensagem ─────────────────────────────────────────────────────
--
-- Fora da janela de 24 horas o WhatsApp só deixa enviar modelos previamente
-- aprovados pela Meta — não é possível escrever texto livre. Isto guarda os
-- modelos de cada conta para o CRM os poder oferecer sem ir perguntar à Meta a
-- cada abertura de conversa.

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id      UUID NOT NULL REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  meta_id         TEXT NOT NULL,
  name            TEXT NOT NULL,
  language        TEXT NOT NULL,
  category        TEXT,
  -- APPROVED | PENDING | REJECTED | PAUSED | DISABLED
  status          TEXT NOT NULL,
  -- Os componentes tal como a Meta os devolve: cabeçalho, corpo, botões e as
  -- variáveis de cada um. Guarda-se inteiro para o compositor poder desenhar o
  -- formulário sem ter de adivinhar a estrutura.
  components      JSONB NOT NULL DEFAULT '[]'::jsonb,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, meta_id)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_templates_select ON public.whatsapp_templates
  FOR SELECT USING (public.pode_aceder_caixa(auth.uid(), channel_id));

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_canal
  ON public.whatsapp_templates (channel_id, status);
