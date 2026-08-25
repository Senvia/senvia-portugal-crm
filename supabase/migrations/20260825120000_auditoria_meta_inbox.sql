-- Auditoria do inbox da Meta — o que a auditoria de 25/08/2026 encontrou.
--
-- Três coisas, por ordem de gravidade:
--
--   1. As políticas antigas de meta_conversations/meta_messages nunca foram
--      apagadas, e por isso a restrição por caixa não existia.
--   2. Apagar uma caixa levava o histórico de conversas atrás, por cascata.
--   3. As caixas arquivadas precisam de sair dos índices únicos, senão o mesmo
--      número nunca mais se pode voltar a ligar.

-- ── 1. As políticas que a migração anterior julgou ter apagado ──────────────
--
-- A migração 20260813120000 fez `DROP POLICY meta_conversations_all` e
-- `meta_messages_all`. Esses nomes NUNCA EXISTIRAM: as políticas criadas em
-- 20260811190000 chamam-se `_member`. O `DROP ... IF EXISTS` não deu erro
-- nenhum, e as políticas `FOR ALL USING (is_org_member(...))` continuaram lá.
--
-- Como as políticas são permissivas (juntam-se por OR), o resultado é que a
-- restrição por caixa que aquela migração diz introduzir nunca chegou a
-- existir: qualquer colaborador continuava a ler as conversas de TODAS as
-- caixas da organização, e — pior — a poder APAGAR conversas e mensagens de
-- clientes pela API, com a chave anónima do browser.
--
-- Confirmado na produção em 25/08/2026: as duas `_member` estavam vivas ao
-- lado das `_select`/`_update`.
DROP POLICY IF EXISTS meta_conversations_member ON public.meta_conversations;
DROP POLICY IF EXISTS meta_messages_member      ON public.meta_messages;

-- Fica de propósito SEM política de INSERT e SEM política de DELETE: quem
-- escreve nestas tabelas é o webhook, com service_role, que ignora o RLS. Não
-- havendo política, o cliente não insere nem apaga — e mensagens de clientes
-- não se apagam.
--
-- O UPDATE que o CRM faz é um só (marcar como lida, via mark_meta_read, que é
-- SECURITY INVOKER) e já tem a política `meta_conversations_update`.

-- ── 2. Apagar uma caixa não pode apagar o histórico ─────────────────────────
--
-- `meta_conversations.channel_id` é ON DELETE CASCADE e `meta_messages`
-- cascateia a seguir. Bastava um administrador carregar em "Remover" numa caixa
-- — coisa que se faz a sério, entre tentativas falhadas de ligar o WhatsApp —
-- para as conversas todas desse canal desaparecerem sem retorno.
--
-- A saída não é impedir de remover: é ARQUIVAR. A caixa deixa de receber e de
-- enviar, mas continua no CRM e as conversas continuam lá para se lerem. Tirar
-- o acesso ao que um cliente escreveu conta como apagá-lo.

ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.messaging_channels.archived_at IS
  'Caixa desligada mas conservada: não recebe nem envia, e o histórico continua legível.';

-- A permissão de SELECT desta tabela é POR COLUNA desde 20260813120000 (para a
-- `metadata` crua deixar de ser legível). Uma coluna nova não entra sozinha
-- nessa lista — sem isto, qualquer consulta que peça `archived_at` levava
-- "permission denied for table messaging_channels", e o inbox inteiro parava.
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'messaging_channels'
     AND column_name <> 'metadata';

  REVOKE SELECT ON public.messaging_channels FROM authenticated, anon;
  EXECUTE format('GRANT SELECT (%s) ON public.messaging_channels TO authenticated', cols);
END $$;

-- E o que o botão não conseguir evitar, o Postgres evita: uma caixa com
-- conversas não se apaga, arquiva-se. Isto vale para o botão, para o SQL
-- Editor e para qualquer script futuro — que é o ponto de o pôr aqui.
CREATE OR REPLACE FUNCTION public.impedir_apagar_caixa_com_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INTEGER;
BEGIN
  -- Exceção: a organização inteira está a ser eliminada.
  --
  -- `messaging_channels.organization_id` é ON DELETE CASCADE, por isso apagar
  -- uma organização faz o Postgres apagar as caixas dela — e este gatilho
  -- dispararia a meio, deixando a eliminação da organização impossível. Nesse
  -- caso a linha da organização JÁ NÃO EXISTE (as ações de cascata correm
  -- depois de o pai sair), e é assim que se distinguem os dois casos.
  --
  -- Quando é o inquilino todo a sair, as conversas vão com ele: é o que um
  -- pedido de eliminação de conta quer dizer.
  IF NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  SELECT count(*) INTO n
    FROM public.meta_conversations c
   WHERE c.channel_id = OLD.id;

  IF n > 0 THEN
    RAISE EXCEPTION
      'A caixa "%" tem % conversa(s) guardadas e não pode ser apagada. Arquiva-a (archived_at) — o histórico dos clientes não se elimina.',
      COALESCE(OLD.label, OLD.id::text), n
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_impedir_apagar_caixa ON public.messaging_channels;
CREATE TRIGGER trg_impedir_apagar_caixa
  BEFORE DELETE ON public.messaging_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_apagar_caixa_com_historico();

-- ── 3. Índices únicos: uma caixa arquivada não ocupa o lugar ────────────────
--
-- Os índices garantem que a mesma Página/número não serve duas organizações —
-- o webhook resolve por esse id e devolve UMA linha. Mas uma caixa ARQUIVADA já
-- não recebe nada, e mantê-la no índice tornava impossível voltar a ligar o
-- mesmo número depois de o arquivar. Passam a contar só as caixas vivas.

DROP INDEX IF EXISTS public.uniq_meta_page_por_tipo;
CREATE UNIQUE INDEX uniq_meta_page_por_tipo
  ON public.messaging_channels ((metadata->>'page_id'), channel_type)
  WHERE provider = 'meta'
    AND metadata->>'page_id' IS NOT NULL
    AND archived_at IS NULL;

DROP INDEX IF EXISTS public.uniq_whatsapp_phone_number_id;
CREATE UNIQUE INDEX uniq_whatsapp_phone_number_id
  ON public.messaging_channels ((metadata->>'phone_number_id'))
  WHERE provider = 'meta'
    AND metadata->>'phone_number_id' IS NOT NULL
    AND archived_at IS NULL;

-- O webhook procura o canal por estes campos E por `archived_at IS NULL`: com
-- uma caixa arquivada e outra viva para a mesma Página, o `.limit(1)` escolhia
-- ao acaso qual delas recebia as mensagens.
CREATE INDEX IF NOT EXISTS idx_messaging_channels_vivas
  ON public.messaging_channels (organization_id, channel_type)
  WHERE archived_at IS NULL;

-- ── 4. Modelos de WhatsApp: o que faltava para os poder usar ────────────────
--
-- A tabela existe desde 20260813200000 e nunca foi preenchida por nada. Estas
-- colunas são o que a sincronização e o compositor precisam.

ALTER TABLE public.whatsapp_templates
  -- A Meta muda o estado de um modelo por webhook (aprovado, recusado,
  -- pausado). Sem guardar quando, não se sabe se o que está aqui é de hoje ou
  -- de há três meses.
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  -- Porque é que foi recusado. Vem no webhook `message_template_status_update`
  -- e é a única pista acionável quando um modelo não passa.
  ADD COLUMN IF NOT EXISTS rejected_reason   TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_id
  ON public.whatsapp_templates (meta_id);
