-- 1a. Vendas no Starter
UPDATE public.subscription_plans
SET features = jsonb_set(features, '{modules,sales}', 'true')
WHERE id = 'starter';

-- 1b. Limites de utilizadores corretos
UPDATE public.subscription_plans
SET max_users = 5 WHERE id = 'starter';
UPDATE public.subscription_plans
SET max_users = 15 WHERE id = 'pro';

-- 1c. Preço Elite correto
UPDATE public.subscription_plans
SET price_monthly = 147 WHERE id = 'elite';
