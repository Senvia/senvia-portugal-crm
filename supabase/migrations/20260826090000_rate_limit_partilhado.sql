-- Rate limiting partilhado entre instâncias.
--
-- PORQUE É QUE O QUE HAVIA NÃO CHEGAVA
--
-- `_shared/security.ts` já tinha um limitador, mas guarda a contagem NA MEMÓRIA
-- da instância. As Edge Functions correm em várias instâncias ao mesmo tempo e
-- reiniciam a frio a toda a hora: quem manda pedidos a sério cai em instâncias
-- diferentes e cada uma acha que é o primeiro pedido dele. Serve para travar um
-- pico numa instância; não serve para travar um abuso.
--
-- E, sobretudo, só duas funções o chamavam — o `brevo-webhook` e o
-- `stripe-webhook`. O `submit-lead`, que é público, cria leads, dispara emails,
-- notificações e uma classificação por IA a cada pedido, não tinha limite
-- nenhum. Uma tarde de pedidos em ciclo enchia a base de dados de leads falsos
-- e a conta da IA com ela.
--
-- Esta tabela é a contagem que todas as instâncias veem.

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  -- 'submit-lead:1.2.3.4' — o que se está a limitar e a quem.
  bucket       TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só o service_role. Nenhum cliente lê nem escreve isto — saber
-- quanto falta para o limite é meio caminho para o contornar.

CREATE INDEX IF NOT EXISTS idx_rate_limit_janela
  ON public.rate_limit_hits (window_start);

/**
 * Conta um pedido e diz se ele passa.
 *
 * Janela FIXA, não deslizante: mais barata (uma linha, uma escrita) e suficiente
 * para o que isto tem de fazer. O pior caso conhecido de uma janela fixa é
 * deixar passar até ao dobro do limite na fronteira entre duas janelas; para
 * travar abuso de formulários isso não muda nada.
 *
 * Tudo numa só instrução, de propósito: dois pedidos simultâneos sobre o mesmo
 * balde têm de somar 2 e não 1. Um `SELECT` seguido de `UPDATE` perde contagens
 * exatamente quando elas mais importam, que é sob carga.
 */
CREATE OR REPLACE FUNCTION public.rate_limit_check(
  _bucket         TEXT,
  _limit          INTEGER,
  _window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agora  TIMESTAMPTZ := now();
  janela INTERVAL     := make_interval(secs => GREATEST(_window_seconds, 1));
  linha  public.rate_limit_hits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limit_hits AS r (bucket, hits, window_start)
  VALUES (_bucket, 1, agora)
  ON CONFLICT (bucket) DO UPDATE
     SET hits = CASE WHEN r.window_start < agora - janela THEN 1 ELSE r.hits + 1 END,
         window_start = CASE WHEN r.window_start < agora - janela THEN agora ELSE r.window_start END
  RETURNING * INTO linha;

  RETURN jsonb_build_object(
    'allowed', linha.hits <= _limit,
    'hits', linha.hits,
    'limit', _limit,
    -- Quantos segundos até a janela abrir de novo. Vai no cabeçalho Retry-After,
    -- para quem está a integrar saber esperar em vez de martelar.
    'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (linha.window_start + janela) - agora))::INTEGER)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_check(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check(TEXT, INTEGER, INTEGER) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(TEXT, INTEGER, INTEGER) TO service_role;

-- Limpeza: um balde que ninguém tocou há um dia não tem nada a dizer.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rate-limit-limpeza')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limit-limpeza');
    PERFORM cron.schedule(
      'rate-limit-limpeza',
      '23 3 * * *',
      $cron$DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day'$cron$
    );
  END IF;
END $$;
