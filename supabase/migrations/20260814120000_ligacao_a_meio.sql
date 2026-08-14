-- Ligações a meio: guardar o estado entre "autorizei na Meta" e "escolhi qual".
--
-- Porque existe: a ligação do WhatsApp escolhia sozinha a primeira conta que a
-- Meta devolvia. Numa agência, que tem acesso ao Business Manager dos clientes,
-- isso ligou a conta de um CLIENTE à caixa da agência — sem nada para escolher,
-- porque não havia ecrã de escolha nenhum.
--
-- Para haver escolha, o fluxo deixa de ser de um só passo: autoriza-se na Meta,
-- mostram-se as contas, escolhe-se uma, e só então se cria a caixa. Entre esses
-- dois momentos é preciso guardar o token — e ele NÃO pode voltar ao browser
-- pelo caminho. Fica aqui, e o browser leva só um identificador opaco.

CREATE TABLE IF NOT EXISTS public.meta_pending_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- 'whatsapp' | 'instagram' | 'messenger'
  connect         TEXT NOT NULL,
  label           TEXT,
  -- O token do utilizador, que nunca sai daqui.
  user_token      TEXT NOT NULL,
  -- As contas entre as quais escolher, já preparadas para mostrar.
  options         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Curto de propósito: é o tempo de olhar para uma lista e clicar. Um token
  -- guardado à espera é um token a mais no mundo.
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes'
);

ALTER TABLE public.meta_pending_connections ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só o service_role. O browser nunca lê esta tabela — pede à
-- edge function, que é quem tem o token.

CREATE INDEX IF NOT EXISTS idx_pending_expira
  ON public.meta_pending_connections (expires_at);

-- Limpeza. Uma ligação que ninguém concluiu não fica com o token guardado para
-- sempre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('meta-ligacoes-a-meio')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meta-ligacoes-a-meio');
    PERFORM cron.schedule(
      'meta-ligacoes-a-meio',
      '*/15 * * * *',
      $cron$DELETE FROM public.meta_pending_connections WHERE expires_at < now()$cron$
    );
  END IF;
END $$;
