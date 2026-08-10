-- Proíbe registo repetido do mesmo telefone dentro de 24 horas.
--
-- Caso real (10/ago): a mesma pessoa registou-se duas vezes com 4 minutos de
-- intervalo — raul.cfreitas@hmail.com e depois raul.cfreitas@gmail.com, um typo
-- no domínio. Ficaram duas contas, duas organizações (uma delas nunca usada) e
-- dois leads. Nenhum bug: o sistema fez o que lhe pediram, duas vezes.
--
-- Bloquear por email não apanharia nada — o email já é único em auth.users e os
-- dois eram diferentes. O único sinal partilhado era o TELEFONE.
--
-- Comparação pelos últimos 9 dígitos, a mesma convenção usada em contact_notes
-- e inbox_tasks (phone_key), para que formatações diferentes do mesmo número
-- (+351 910..., 910..., 00351910...) contem como iguais.
--
-- Duas camadas:
--   1. recent_signup_exists() — o formulário chama antes de submeter, para dar
--      uma mensagem clara. Necessário porque o GoTrue devolve "Database error
--      saving new user" quando um trigger falha, e o Login.tsx mapeava isso para
--      "código de empresa já está em uso" — a mensagem errada.
--   2. A guarda dentro de handle_new_user — a que realmente impede, já que a
--      verificação do frontend é contornável.

CREATE OR REPLACE FUNCTION public.recent_signup_exists(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.created_at > now() - interval '24 hours'
      AND o.contact_phone IS NOT NULL
      AND length(regexp_replace(o.contact_phone, '\D', '', 'g')) >= 9
      AND right(regexp_replace(o.contact_phone, '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), 9)
  )
  AND length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) >= 9;
$$;

-- anon precisa de executar: a verificação acontece ANTES de haver sessão.
GRANT EXECUTE ON FUNCTION public.recent_signup_exists(text) TO anon, authenticated;

-- A guarda dentro de handle_new_user foi aplicada em produção a partir da
-- definição viva da função (pg_get_functiondef), para não reverter alterações
-- feitas por outras migrações. O bloco inserido, imediatamente antes de
-- INSERT INTO public.organizations, é:
--
--   IF _contact_phone IS NOT NULL
--      AND length(regexp_replace(_contact_phone, '\D', '', 'g')) >= 9
--      AND EXISTS (
--        SELECT 1 FROM public.organizations o
--        WHERE o.created_at > now() - interval '24 hours'
--          AND o.contact_phone IS NOT NULL
--          AND right(regexp_replace(o.contact_phone, '\D', '', 'g'), 9)
--              = right(regexp_replace(_contact_phone, '\D', '', 'g'), 9)
--      )
--   THEN
--     RAISE EXCEPTION 'Recent signup exists for this phone' USING ERRCODE = 'unique_violation';
--   END IF;
--
-- Para reaplicar num ambiente novo, correr o script equivalente ou colar o
-- bloco acima na função.
