-- Auditoria da caixa de email: credenciais fora do browser e acesso por caixa.

-- ── 1. As passwords saem do metadata ────────────────────────────────────────
--
-- `messaging_channels.metadata` guardava `imap_password` e `smtp_password` em
-- texto simples, e o CRM lia a tabela com `select('*')`. Qualquer membro da
-- organização descarregava a password da caixa de correio da empresa para o
-- browser — e com ela entra no email por fora do CRM, para sempre, mesmo depois
-- de sair da equipa.
--
-- Vão para a mesma tabela onde já vive o token da Meta: RLS ligado, ZERO
-- políticas, só o service_role (e o gateway, que liga por Postgres direto).

ALTER TABLE public.messaging_channel_secrets
  ADD COLUMN IF NOT EXISTS imap_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password TEXT;

INSERT INTO public.messaging_channel_secrets (channel_id, organization_id, imap_password, smtp_password)
SELECT id, organization_id, metadata->>'imap_password', metadata->>'smtp_password'
  FROM public.messaging_channels
 WHERE channel_type = 'email'
   AND (metadata ? 'imap_password' OR metadata ? 'smtp_password')
ON CONFLICT (channel_id) DO UPDATE
  SET imap_password = EXCLUDED.imap_password,
      smtp_password = EXCLUDED.smtp_password,
      updated_at    = now();

-- ── 2. Uma versão do metadata que pode ser vista ────────────────────────────
--
-- O metadata tem coisas que a interface precisa (endereço, servidor, o nome da
-- Página) e coisas que nunca deve ver. Em vez de confiar em cada consulta se
-- lembrar de escolher colunas, o Postgres passa a garanti-lo: a coluna crua
-- deixa de ser legível por quem não é o servidor, e a interface passa a ler
-- esta, que é a mesma sem os segredos.

ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS metadata_public JSONB
  GENERATED ALWAYS AS (
    (metadata - 'imap_password') - 'smtp_password' - 'page_access_token'
  ) STORED;

-- A parte que torna isto real: mesmo que alguém volte a escrever `select('*')`,
-- o Postgres recusa. Não é uma convenção, é uma permissão.
--
-- Atenção ao detalhe que não é óbvio: um `REVOKE SELECT (metadata)` sozinho NÃO
-- funciona. Existe uma permissão de SELECT sobre a TABELA inteira, e essa cobre
-- todas as colunas — a revogação por coluna não a desfaz. Tem de ser ao
-- contrário: tirar a da tabela e devolver coluna a coluna, menos esta.
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

-- E o que já lá estava sai agora. Até aqui a password continuava gravada, só
-- deixara de ser servida — o que não é a mesma coisa.
UPDATE public.messaging_channels
   SET metadata = (metadata - 'imap_password') - 'smtp_password'
 WHERE channel_type = 'email'
   AND (metadata ? 'imap_password' OR metadata ? 'smtp_password');

-- ── 3. Quem atende a caixa é quem a lê ──────────────────────────────────────
--
-- A interface promete: "Com pessoas selecionadas, só elas (e os administradores)
-- a veem." Não era verdade: as políticas eram `is_org_member`, por isso qualquer
-- colaborador lia TODOS os emails e TODAS as conversas da organização pela API,
-- incluindo as de caixas que não atende. Numa caixa de email isso é
-- correspondência privada de outra pessoa.

CREATE OR REPLACE FUNCTION public.pode_aceder_caixa(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.messaging_channels c
     WHERE c.id = _channel_id
       AND public.is_org_member(_user_id, c.organization_id)
       AND (
         -- Sem atendentes definidos, a caixa é de toda a gente.
         c.assigned_user_ids IS NULL
         OR cardinality(c.assigned_user_ids) = 0
         OR _user_id = ANY (c.assigned_user_ids)
         -- Os administradores veem sempre — é o que a interface diz.
         OR public.has_role(_user_id, 'admin'::app_role)
         OR public.has_role(_user_id, 'super_admin'::app_role)
       )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.pode_aceder_caixa(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_aceder_caixa(UUID, UUID) TO authenticated;

-- Email ---------------------------------------------------------------------

DROP POLICY IF EXISTS email_messages_select ON public.email_messages;
CREATE POLICY email_messages_select ON public.email_messages
  FOR SELECT USING (public.pode_aceder_caixa(auth.uid(), channel_id));

DROP POLICY IF EXISTS email_folders_select ON public.email_folders;
CREATE POLICY email_folders_select ON public.email_folders
  FOR SELECT USING (public.pode_aceder_caixa(auth.uid(), channel_id));

DROP POLICY IF EXISTS email_drafts_all ON public.email_drafts;
CREATE POLICY email_drafts_all ON public.email_drafts
  FOR ALL USING (public.pode_aceder_caixa(auth.uid(), channel_id))
  WITH CHECK (public.pode_aceder_caixa(auth.uid(), channel_id));

-- Os anexos não têm channel_id — chega-se lá pela mensagem.
DROP POLICY IF EXISTS email_attachments_select ON public.email_attachments;
CREATE POLICY email_attachments_select ON public.email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.email_messages m
       WHERE m.id = email_attachments.message_id
         AND public.pode_aceder_caixa(auth.uid(), m.channel_id)
    )
  );

-- Comandos: enviar um email em nome da empresa é a ação mais séria desta caixa.
-- Fica limitada a quem a atende, e o autor passa a ficar registado.
DROP POLICY IF EXISTS email_commands_insert ON public.email_commands;
CREATE POLICY email_commands_insert ON public.email_commands
  FOR INSERT WITH CHECK (
    public.pode_aceder_caixa(auth.uid(), channel_id)
    -- Sem isto, bastava mandar o `created_by` de outra pessoa e o registo
    -- de quem enviou passava a apontar para quem não enviou.
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS email_commands_select ON public.email_commands;
CREATE POLICY email_commands_select ON public.email_commands
  FOR SELECT USING (public.pode_aceder_caixa(auth.uid(), channel_id));

-- Instagram e Messenger -----------------------------------------------------
--
-- Estas eram `FOR ALL`: além de lerem tudo, os colaboradores podiam ALTERAR e
-- APAGAR conversas e mensagens de qualquer caixa. Passam a leitura por caixa,
-- mais a única escrita que o CRM faz do lado do cliente (marcar como lida, que
-- já é feita pela função mark_meta_read).

DROP POLICY IF EXISTS meta_conversations_all ON public.meta_conversations;
DROP POLICY IF EXISTS "meta_conversations_all" ON public.meta_conversations;
CREATE POLICY meta_conversations_select ON public.meta_conversations
  FOR SELECT USING (public.pode_aceder_caixa(auth.uid(), channel_id));
CREATE POLICY meta_conversations_update ON public.meta_conversations
  FOR UPDATE USING (public.pode_aceder_caixa(auth.uid(), channel_id))
  WITH CHECK (public.pode_aceder_caixa(auth.uid(), channel_id));

DROP POLICY IF EXISTS meta_messages_all ON public.meta_messages;
DROP POLICY IF EXISTS "meta_messages_all" ON public.meta_messages;
CREATE POLICY meta_messages_select ON public.meta_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meta_conversations c
       WHERE c.id = meta_messages.conversation_id
         AND public.pode_aceder_caixa(auth.uid(), c.channel_id)
    )
  );

-- ── 4. Comandos presos ──────────────────────────────────────────────────────
--
-- Há um `delete` em `processing` desde 10 de agosto. Sem prazo, um comando que
-- o gateway apanhe e não termine (reinício, queda de IMAP) fica assim para
-- sempre: a interface já removeu a mensagem da lista de forma otimista, e
-- ninguém fica a saber que a ação nunca chegou a acontecer.

UPDATE public.email_commands
   SET status = 'error',
       error  = COALESCE(error, 'Ficou por terminar — o serviço de email reiniciou a meio.')
 WHERE status = 'processing'
   AND created_at < now() - interval '30 minutes';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('email-comandos-presos')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-comandos-presos');
    PERFORM cron.schedule(
      'email-comandos-presos',
      '*/10 * * * *',
      $cron$
        UPDATE public.email_commands
           SET status = 'error',
               error  = COALESCE(error, 'Ficou por terminar — o serviço de email reiniciou a meio.')
         WHERE status = 'processing'
           AND created_at < now() - interval '30 minutes'
      $cron$
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_commands_estado
  ON public.email_commands (channel_id, status, created_at DESC);
