-- Segredos dos canais fora do alcance do browser.
--
-- O token da Página estava em messaging_channels.metadata. Essa tabela é lida
-- pelo cliente (a política de RLS deixa qualquer MEMBRO da organização vê-la), e
-- o frontend fazia `select('*')` — ou seja, o token era entregue ao browser de
-- todos os colaboradores, em todas as páginas do CRM.
--
-- Quem tiver esse token lê e envia mensagens em nome da empresa, fora do CRM,
-- sem rasto e sem forma de revogar a não ser retirando a autorização à app.
--
-- Aqui os segredos passam a viver numa tabela com RLS ligada e ZERO políticas:
-- nenhum cliente lhe chega, só as edge functions (service_role, que ignora RLS).
CREATE TABLE IF NOT EXISTS public.messaging_channel_secrets (
  channel_id        UUID PRIMARY KEY REFERENCES public.messaging_channels(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_access_token TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messaging_channel_secrets ENABLE ROW LEVEL SECURITY;
-- Sem políticas de propósito. Ver acima.

-- Mover os tokens que já existem e limpá-los do metadata.
INSERT INTO public.messaging_channel_secrets (channel_id, organization_id, page_access_token)
SELECT id, organization_id, metadata->>'page_access_token'
FROM public.messaging_channels
WHERE metadata->>'page_access_token' IS NOT NULL
ON CONFLICT (channel_id) DO UPDATE SET page_access_token = EXCLUDED.page_access_token;

UPDATE public.messaging_channels
SET metadata = metadata - 'page_access_token'
WHERE metadata ? 'page_access_token';

-- Verificação: tem de dar 0.
SELECT count(*) AS tokens_ainda_expostos
FROM public.messaging_channels
WHERE metadata ? 'page_access_token';
