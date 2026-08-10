-- Trials passam a ver o sistema todo.
--
-- Sintoma: entrando numa organização em trial, Financeiro, Marketing, Prospects
-- e E-commerce apareciam com cadeado. Confirmado em produção: 6 organizações com
-- trial ativo, todas nesta situação.
--
-- Havia DUAS causas independentes, e é preciso corrigir as duas — cada uma
-- sozinha não resolve:
--
--   1. FRONTEND (src/contexts/AuthContext.tsx). O SAFE_ORG_FIELDS não trazia
--      trial_ends_at, first_paid_at nem billing_exempt. Sem eles isOrgOnTrial()
--      faz `if (!trialEnd) return false` — conclui que não há trial. O plano
--      efetivo passava a ser organizations.plan = 'basic', um id que nem sequer
--      existe em subscription_plans, e a app caía no plano por omissão (Starter),
--      que tranca exatamente esses quatro módulos.
--
--   2. ESTA MIGRAÇÃO. O DEFAULT da coluna enabled_modules só liga
--      {sales, calendar, proposals} e desliga ecommerce; finance, marketing e
--      prospects nem constam, logo caem no DEFAULT_MODULES=false do frontend.
--      Isto é o que o AppSidebar lê depois de decidir o cadeado:
--
--        if (isModuleLocked(key)) return true;   // trancado  -> MOSTRA (upsell)
--        if (!modules[key])       return false;  // desligado -> ESCONDE
--
--      Ou seja: corrigir só o ponto 1 tiraria o cadeado mas faria os itens
--      DESAPARECEREM do menu — pior do que estava.
--
-- ORDEM: correr este SQL antes (ou ao mesmo tempo que) o deploy do frontend.
--
-- O gate de plano continua a mandar. Para um plano baixo, o useModules força
-- finance/marketing/ecommerce/prospects a false na leitura. O que fica gravado
-- aqui é a preferência da organização; quem decide o que se vê é o plano. Por
-- isso ligar tudo por omissão não dá acesso indevido a quem não é trial.

-- ── 1. Novas organizações nascem com tudo ligado ────────────────────────────
-- Todas as chaves de EnabledModules (src/hooks/useModules.ts).
ALTER TABLE public.organizations
  ALTER COLUMN enabled_modules SET DEFAULT '{
    "proposals": true,
    "calendar": true,
    "sales": true,
    "ecommerce": true,
    "clients": true,
    "marketing": true,
    "finance": true,
    "energy": true,
    "prospects": true,
    "inbox": true
  }'::jsonb;

-- ── 2. Backfill das que ainda têm o default antigo INTACTO ──────────────────
-- A comparação é com o valor exato do default antigo. Se alguém mexeu nos
-- módulos, o valor deixa de coincidir e a linha não entra — é impossível
-- sobrepor uma escolha deliberada.
UPDATE public.organizations
SET enabled_modules = '{
  "proposals": true,
  "calendar": true,
  "sales": true,
  "ecommerce": true,
  "clients": true,
  "marketing": true,
  "finance": true,
  "energy": true,
  "prospects": true,
  "inbox": true
}'::jsonb
WHERE enabled_modules = '{"sales": true, "calendar": true, "ecommerce": false, "proposals": true}'::jsonb;

-- ── 3. Verificação ──────────────────────────────────────────────────────────
-- Deve devolver os trials ativos, todos com finance/marketing/ecommerce/
-- prospects a true.
SELECT name,
       enabled_modules->>'finance'   AS finance,
       enabled_modules->>'marketing' AS marketing,
       enabled_modules->>'ecommerce' AS ecommerce,
       enabled_modules->>'prospects' AS prospects
FROM public.organizations
WHERE trial_ends_at > now()
  AND first_paid_at IS NULL
  AND NOT billing_exempt
ORDER BY created_at DESC;
