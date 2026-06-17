-- Corrige a corrupção de organizations.first_paid_at.
--
-- Causa: o backfill heurístico da migração 20260601100000_payer_status.sql
-- assumiu que os trials ficam no plano 'starter' e marcou como pagantes
-- (first_paid_at = início do trial) todas as orgs com plan <> 'starter'.
-- Mas os trials reais são criados no plano 'basic' (via RPC
-- create_organization_for_current_user) — por isso TODOS os trials foram
-- erradamente carimbados como pagantes. Resultado: a métrica de conversão
-- dava ~100% quando a realidade é ~6%.
--
-- Sinal real de pagamento: current_period_end. É escrito pelo webhook do
-- Stripe e pela função check-subscription APENAS quando existe uma subscrição
-- Stripe. Um pagante real tem sempre current_period_end preenchido. Logo, as
-- orgs com first_paid_at preenchido mas current_period_end NULL são, com
-- certeza, vítimas do backfill — e devem voltar a ser tratadas como trial.
--
-- billing_exempt (orgs internas/demo) fica intacto.

UPDATE public.organizations
SET first_paid_at = NULL
WHERE first_paid_at IS NOT NULL
  AND current_period_end IS NULL
  AND COALESCE(billing_exempt, false) = false;
