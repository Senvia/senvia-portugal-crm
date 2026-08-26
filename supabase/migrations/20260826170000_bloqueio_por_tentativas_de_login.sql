-- Bloqueio da conta ao fim de N tentativas de senha falhadas.
--
-- PORQUE É QUE ISTO É UM HOOK E NÃO CÓDIGO NO CRM
--
-- A tentação é contar as falhas no ecrã de login e recusar a partir da quinta.
-- Isso não é segurança, é decoração: quem quer forçar uma senha não usa o nosso
-- ecrã — chama o endpoint de autenticação diretamente com a chave pública, que
-- é pública precisamente para isso.
--
-- Este hook corre DENTRO do serviço de autenticação da Supabase, logo a seguir
-- à verificação da senha e antes de a sessão ser emitida. Não há caminho que o
-- contorne, porque ele É o caminho.
--
-- POLÍTICA
--
--   5 falhas em 15 minutos  →  conta trancada 15 minutos
--
-- Trancar por tempo e não para sempre é deliberado: um bloqueio permanente
-- transforma-se em negação de serviço — bastava alguém errar a senha de um
-- colega cinco vezes para o deixar de fora até alguém do suporte intervir.
-- Quinze minutos tornam a força bruta inviável e resolvem-se com um café.

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  user_id        UUID PRIMARY KEY,
  falhas         INTEGER NOT NULL DEFAULT 0,
  primeira_falha TIMESTAMPTZ,
  bloqueado_ate  TIMESTAMPTZ,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
-- Sem políticas: ninguém lê isto pelo cliente. Saber quantas falhas faltam para
-- o bloqueio é informação útil para quem está a atacar, e para mais ninguém.

CREATE INDEX IF NOT EXISTS idx_login_attempts_bloqueio
  ON public.auth_login_attempts (bloqueado_ate)
  WHERE bloqueado_ate IS NOT NULL;

/**
 * O hook. A Supabase chama-o com { user_id, valid } depois de verificar a senha.
 *
 * Devolve `{"decision":"continue"}` para deixar entrar, ou
 * `{"decision":"reject","message":"..."}` para recusar.
 *
 * FALHA ABERTO, E ISSO NÃO É DESLEIXO
 *
 * Todo o corpo está dentro de um `EXCEPTION WHEN OTHERS`. Se esta função der
 * erro por qualquer razão, devolve "continue" e a autenticação segue como se ela
 * não existisse. A alternativa era um erro aqui trancar TODA A GENTE fora do
 * produto, incluindo quem o pudesse vir reparar — o remédio seria pior do que a
 * doença que trata.
 */
CREATE OR REPLACE FUNCTION public.hook_password_verification_attempt(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid            UUID;
  senha_certa    BOOLEAN;
  linha          public.auth_login_attempts%ROWTYPE;
  agora          TIMESTAMPTZ := now();
  MAX_FALHAS     CONSTANT INTEGER  := 5;
  JANELA         CONSTANT INTERVAL := interval '15 minutes';
  DURACAO        CONSTANT INTERVAL := interval '15 minutes';
  faltam_minutos INTEGER;
BEGIN
  uid := (event->>'user_id')::UUID;
  senha_certa := COALESCE((event->>'valid')::BOOLEAN, false);

  IF uid IS NULL THEN
    RETURN '{"decision":"continue"}'::JSONB;
  END IF;

  SELECT * INTO linha FROM public.auth_login_attempts WHERE user_id = uid;

  -- ── Já está trancada? ─────────────────────────────────────────────────────
  --
  -- Recusa-se MESMO COM A SENHA CERTA. É o ponto de um bloqueio: enquanto ele
  -- dura, acertar na senha não vale de nada — senão quem estivesse a adivinhar
  -- só teria de continuar a adivinhar.
  IF linha.bloqueado_ate IS NOT NULL AND linha.bloqueado_ate > agora THEN
    faltam_minutos := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (linha.bloqueado_ate - agora)) / 60)::INTEGER);
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', format(
        'Demasiadas tentativas falhadas. A conta está bloqueada durante %s minuto(s). Se foste tu, espera; se não, muda a senha.',
        faltam_minutos)
    );
  END IF;

  -- ── Senha certa: limpa o histórico ────────────────────────────────────────
  IF senha_certa THEN
    DELETE FROM public.auth_login_attempts WHERE user_id = uid;
    RETURN '{"decision":"continue"}'::JSONB;
  END IF;

  -- ── Senha errada: conta ───────────────────────────────────────────────────
  --
  -- A janela é deslizante no sentido que interessa: falhas antigas não contam.
  -- Três enganos hoje e dois daqui a uma semana não trancam ninguém.
  INSERT INTO public.auth_login_attempts AS a (user_id, falhas, primeira_falha, atualizado_em)
  VALUES (uid, 1, agora, agora)
  ON CONFLICT (user_id) DO UPDATE
     SET falhas = CASE WHEN a.primeira_falha < agora - JANELA THEN 1 ELSE a.falhas + 1 END,
         primeira_falha = CASE WHEN a.primeira_falha < agora - JANELA THEN agora ELSE a.primeira_falha END,
         atualizado_em = agora
  RETURNING * INTO linha;

  IF linha.falhas >= MAX_FALHAS THEN
    UPDATE public.auth_login_attempts
       SET bloqueado_ate = agora + DURACAO, falhas = 0, primeira_falha = NULL
     WHERE user_id = uid;

    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', format(
        'Demasiadas tentativas falhadas. A conta fica bloqueada durante %s minutos.',
        EXTRACT(EPOCH FROM DURACAO) / 60)
    );
  END IF;

  -- Ainda dentro do permitido: deixa a autenticação seguir e dar o erro dela.
  RETURN '{"decision":"continue"}'::JSONB;

EXCEPTION WHEN OTHERS THEN
  -- Ver o comentário acima: um erro aqui não pode trancar o produto.
  RAISE WARNING 'hook_password_verification_attempt falhou, a deixar passar: %', SQLERRM;
  RETURN '{"decision":"continue"}'::JSONB;
END $$;

-- ── Permissões ──────────────────────────────────────────────────────────────
--
-- Só o serviço de autenticação chama isto. Se ficasse ao alcance do cliente,
-- qualquer pessoa podia chamá-la com o `user_id` de outra e trancar-lhe a conta
-- — um bloqueio pensado contra ataques passava a ser a ferramenta deles.
REVOKE EXECUTE ON FUNCTION public.hook_password_verification_attempt(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hook_password_verification_attempt(JSONB) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt(JSONB) TO supabase_auth_admin;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Limpeza: linhas antigas não dizem nada e não têm de ficar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('login-attempts-limpeza')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'login-attempts-limpeza');
    PERFORM cron.schedule(
      'login-attempts-limpeza',
      '41 4 * * *',
      $cron$DELETE FROM public.auth_login_attempts
             WHERE atualizado_em < now() - interval '1 day'
               AND (bloqueado_ate IS NULL OR bloqueado_ate < now())$cron$
    );
  END IF;
END $$;
