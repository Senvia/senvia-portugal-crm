-- Permite mapeamentos anuais e mais de um preço por produto Stripe.
--
-- O domínio nasceu mensal-apenas (restrição do plano original). A importação do
-- catálogo real do Senvia mostrou que isso não chega: os planos Senvia OS têm
-- preço mensal E anual no MESMO produto Stripe (ex.: Elite 147€/mês e
-- 1152€/ano em prod_U0wG6doz0zgZFV). Duas constraints impediam:
--
--   1. interval = 'month'                                → bloqueia o anual;
--   2. unique (stripe_connection_id, stripe_product_id)  → um só mapeamento por
--      produto Stripe, quando mensal e anual são duas coisas vendáveis.
--
-- A identidade verdadeira do que se vende é o PREÇO, não o produto: a unicidade
-- por (connection, price) mantém-se e chega. No CRM, cada preço é um produto
-- próprio ("Elite (Mensal)", "Elite (Anual)").
--
-- Nota deliberada: sale_recurrences continua mensal-apenas. Vender uma
-- subscrição ANUAL pelo fluxo recorrente novo continua bloqueado até esse
-- domínio ser estendido — isto abre apenas o mapeamento do catálogo.

alter table public.stripe_product_mappings
  drop constraint stripe_product_mappings_interval_check;

alter table public.stripe_product_mappings
  add constraint stripe_product_mappings_interval_check
  check (interval in ('month', 'year'));

alter table public.stripe_product_mappings
  drop constraint stripe_product_mappings_product_key;
