-- Reajuste de limites dos planos + override de utilizadores por organização.
--   Starter: 10/2 -> 5/5   (utilizadores / formulários)
--   Pro:     25/10 -> 15/15
--   Elite:   mantém ilimitado (NULL)
-- Os módulos por plano já estão corretos em subscription_plans.features.modules
-- (Starter sem nenhum; Pro com vendas+marketing; Elite com tudo), por isso só
-- mexemos nos limites.
--
-- Adiciona organizations.max_users_override: quando preenchido, sobrepõe o
-- limite do plano (grandfathering / exceções comerciais). O edge function
-- create-team-member usa COALESCE(override, plano.max_users).
-- A "Escolha Inteligente" tinha uma exceção combinada de 6 utilizadores no
-- Starter — fica registada via override para não ser afetada pelo novo limite 5.

UPDATE public.subscription_plans SET max_users = 5,  max_forms = 5  WHERE id = 'starter';
UPDATE public.subscription_plans SET max_users = 15, max_forms = 15 WHERE id = 'pro';

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_users_override integer;

COMMENT ON COLUMN public.organizations.max_users_override IS
  'Limite de utilizadores específico desta org; sobrepõe subscription_plans.max_users quando preenchido (grandfathering / exceções comerciais).';

UPDATE public.organizations SET max_users_override = 6 WHERE name ILIKE 'Escolha Inteligente%';
