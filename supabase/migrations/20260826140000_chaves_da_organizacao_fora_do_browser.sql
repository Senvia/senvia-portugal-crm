-- As chaves de API da organização saem do alcance do browser.
--
-- O QUE ESTAVA ERRADO
--
-- `organizations` tem onze colunas de segredos — a chave da InvoiceXpress, a da
-- Brevo, a password do KeyInvoice, o token da Meta, as chaves do WhatsApp e do
-- Chatwoot — e a política de RLS chama-se "Users view own organization": QUALQUER
-- membro, não só administradores. A permissão de coluna deixava lê-las.
--
-- A app tinha a convenção certa (o AuthContext usa uma lista `SAFE_ORG_FIELDS`
-- que as exclui), mas uma convenção no código não é uma permissão na base de
-- dados: bastava a um colaborador escrever
--
--     supabase.from('organizations').select('invoicexpress_api_key')
--
-- no browser para receber a chave. Com ela emite-se faturação em nome da
-- empresa, por fora do CRM, para sempre — mesmo depois de sair da equipa.
--
-- É exatamente o mesmo problema que já tinha sido resolvido em
-- `messaging_channels` para as passwords de IMAP/SMTP (migração 20260813120000).
-- Aqui aplica-se o mesmo padrão: o Postgres passa a garantir o que antes era
-- só uma boa intenção.

-- ── 1. O que a interface precisa mesmo de saber ─────────────────────────────
--
-- Nenhum ecrã precisa do VALOR da chave — precisa de saber se está configurada,
-- para mostrar "ligado" ou oferecer o botão de configurar. Foram verificados
-- todos os usos no frontend, um a um: são todos verificações booleanas, menos
-- os dois formulários que as editam (e esses passam a ser de escrita apenas).
--
-- Colunas GERADAS: o Postgres mantém-nas em dia sozinho, sem gatilho nenhum,
-- e não há forma de ficarem dessincronizadas da chave que descrevem.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tem_brevo_api_key BOOLEAN
    GENERATED ALWAYS AS (brevo_api_key IS NOT NULL AND brevo_api_key <> '') STORED,
  ADD COLUMN IF NOT EXISTS tem_invoicexpress_api_key BOOLEAN
    GENERATED ALWAYS AS (invoicexpress_api_key IS NOT NULL AND invoicexpress_api_key <> '') STORED,
  ADD COLUMN IF NOT EXISTS tem_keyinvoice_password BOOLEAN
    GENERATED ALWAYS AS (keyinvoice_password IS NOT NULL AND keyinvoice_password <> '') STORED,
  ADD COLUMN IF NOT EXISTS tem_whatsapp_api_key BOOLEAN
    GENERATED ALWAYS AS (whatsapp_api_key IS NOT NULL AND whatsapp_api_key <> '') STORED,
  ADD COLUMN IF NOT EXISTS tem_meta_conversions_token BOOLEAN
    GENERATED ALWAYS AS (meta_conversions_api_token IS NOT NULL AND meta_conversions_api_token <> '') STORED;

COMMENT ON COLUMN public.organizations.tem_invoicexpress_api_key IS
  'A chave está configurada? O valor em si não é legível pelo cliente.';

-- ── 2. As colunas de segredos deixam de ser legíveis ────────────────────────
--
-- ATENÇÃO AO DETALHE QUE NÃO É ÓBVIO, e que já mordeu uma vez neste projeto:
-- um `REVOKE SELECT (coluna)` sozinho NÃO funciona. Existe uma permissão de
-- SELECT sobre a TABELA inteira e essa cobre todas as colunas — a revogação por
-- coluna não a desfaz. Tem de ser ao contrário: tirar a da tabela e devolver
-- coluna a coluna, menos estas.
--
-- Consequência a lembrar: uma coluna NOVA nesta tabela não entra sozinha na
-- lista e fica ilegível para o cliente. Quem acrescentar colunas tem de voltar
-- a correr este bloco — é o preço de o Postgres garantir isto em vez de se
-- confiar em cada consulta se lembrar.
DO $$
DECLARE
  segredos TEXT[] := ARRAY[
    'brevo_api_key',
    'invoicexpress_api_key',
    'keyinvoice_password',
    'keyinvoice_token',
    'keyinvoice_token_expires_at',
    'whatsapp_api_key',
    'meta_conversions_api_token',
    'chatwoot_account_token',
    'chatwoot_webhook_secret',
    'webhook_token',
    'webhook_token_dedicated'
  ];
  cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'organizations'
     AND NOT (column_name = ANY (segredos));

  REVOKE SELECT ON public.organizations FROM authenticated, anon;
  EXECUTE format('GRANT SELECT (%s) ON public.organizations TO authenticated', cols);
  -- O `anon` fica com as mesmas colunas: hoje o RLS já não lhe devolve linha
  -- nenhuma (a política compara com `auth.uid()`, que é nulo), mas se algum dia
  -- alguém acrescentar uma política pública, os segredos continuam de fora.
  EXECUTE format('GRANT SELECT (%s) ON public.organizations TO anon', cols);
END $$;

-- O UPDATE não se toca: é ele que deixa um administrador GRAVAR uma chave nova.
-- Escrever sem poder ler é exatamente o que se quer — é assim que a Stripe e o
-- GitHub tratam as chaves deles, e é por isso que os formulários de edição
-- passam a dizer "deixa em branco para manter a atual".
--
-- Nota: um `UPDATE ... RETURNING` que peça uma destas colunas passa a falhar.
-- O CRM não faz isso; se algum dia precisar, o caminho é uma edge function.
