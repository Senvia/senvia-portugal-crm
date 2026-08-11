-- Registo dos pedidos de eliminação de dados vindos da Meta.
--
-- A Meta exige que qualquer app que trate dados da plataforma exponha um
-- Data Deletion Callback (ver supabase/functions/meta-data-deletion). É um dos
-- requisitos verificados na App Review, e não existia — a app de Instagram
-- nunca teria passado sem isto.
--
-- Esta tabela guarda o pedido ANTES de se apagar seja o que for. Um pedido de
-- eliminação que desaparece sem rasto é o pior resultado possível se alguém
-- perguntar mais tarde o que foi feito e quando.

CREATE TABLE IF NOT EXISTS public.meta_data_deletion_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Devolvido à Meta e mostrado ao utilizador na página de estado.
  confirmation_code TEXT NOT NULL UNIQUE,
  -- ID do utilizador na Meta (Instagram/Facebook). Não é o nosso user_id.
  meta_user_id      TEXT NOT NULL,
  -- O signed_request descodificado, tal como veio. Guardado por inteiro porque
  -- é a única prova do que a Meta pediu.
  payload           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_deletion_meta_user
  ON public.meta_data_deletion_requests (meta_user_id);
CREATE INDEX IF NOT EXISTS idx_meta_deletion_created
  ON public.meta_data_deletion_requests (created_at DESC);

ALTER TABLE public.meta_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Sem políticas de leitura para utilizadores: isto é um registo de conformidade,
-- escrito e lido apenas pela edge function com service_role (que ignora RLS).
-- Nenhuma organização tem motivo para ver os pedidos das outras, e o payload
-- traz identificadores de pessoas. RLS ligada sem políticas = ninguém acede
-- pelo cliente, que é exatamente o que se pretende.
