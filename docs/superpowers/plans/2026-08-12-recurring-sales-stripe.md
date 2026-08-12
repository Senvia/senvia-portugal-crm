# Vendas Recorrentes e Stripe por Organização — Plano de Implementação

> **Para agentes de implementação:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` e executar tarefa por tarefa. Os passos usam checkboxes para acompanhamento.

**Objetivo:** Implementar recorrências mensais idempotentes, Stripe Connect por organização, Checkout ligado inequivocamente à venda e financeiro por ciclo, incluindo reparação conservadora dos dados existentes.

**Arquitetura:** `sales` permanece o contrato inicial; `sale_recurrences` mantém o estado do serviço e da cobrança; `sale_recurring_cycles` representa cada competência mensal. Stripe é um provedor opcional: contas ligadas por Connect, recursos mapeados por IDs e metadata, eventos processados por conta e ciclos liquidados pelo valor bruto. A transição mantém os campos antigos somente como compatibilidade até todos os consumidores usarem as novas entidades.

**Stack:** React 18, TypeScript 5.8, TanStack Query, Supabase/PostgreSQL, Supabase Edge Functions (Deno), Stripe SDK 18.5, Vite 5, Tailwind/shadcn.

## Restrições globais

- Trabalhar apenas na branch `codex/recurring-sales-stripe`; não fazer merge, push ou commit em `main`.
- Preservar as alterações locais preexistentes em `.omo/run-continuation/...` e `supabase/functions/meta-webhook/index.ts`.
- Uma venda tem no máximo uma recorrência ativa nesta versão; moeda única EUR e intervalo mensal.
- Serviço e cobrança são estados independentes; falha de pagamento nunca desativa automaticamente o serviço.
- Dívida e liquidação usam o valor bruto; taxa e líquido Stripe são campos separados.
- Associação Stripe usa `organization_id`, `sale_id`, `recurrence_id` e IDs Stripe; nunca e-mail, nome ou “primeira venda”.
- Crons, webhooks, Checkout e reparação devem ser idempotentes.
- Não apagar pagamentos existentes nem resolver associações ambíguas automaticamente.
- Credenciais e segredos permanecem em secrets/Vault; logs não incluem tokens, cartão ou payload pessoal completo.
- Novos módulos TypeScript devem ficar abaixo de 250 linhas puras; extrair unidades das telas existentes antes de acrescentar comportamento.
- Nenhum novo `any`, assertion `as any`, `@ts-ignore`, `@ts-expect-error` ou `!` não nulo.
- Cada tarefa segue vermelho → verde → refactor e termina com validação independente.

---

## Estrutura de ficheiros

### Domínio e dados

- `supabase/migrations/20260812120000_recurring_sales_domain.sql`: tabelas, constraints, índices, RLS, funções de estado e ciclos.
- `supabase/migrations/20260812121000_recurring_sales_compatibility.sql`: backfill determinístico e vista/RPC de compatibilidade.
- `supabase/tests/recurring_sales_domain.sql`: testes SQL transacionais de isolamento, datas e idempotência.
- `src/types/recurring-sales.ts`: uniões de estado e tipos de recorrência/ciclo/ligação Stripe.
- `src/integrations/supabase/types.ts`: tipos regenerados depois das migrações.

### Stripe servidor

- `supabase/functions/_shared/stripe-connect.ts`: cliente Stripe conectado e resolução segura por `acct_...`.
- `supabase/functions/_shared/stripe-recurring.ts`: schemas/metadata e conversão de Invoice/Subscription para ciclos.
- `supabase/functions/stripe-connect/index.ts`: iniciar OAuth, callback, estado e desligar.
- `supabase/functions/stripe-product-sync/index.ts`: criar/atualizar Product e substituir Price.
- `supabase/functions/stripe-sale-checkout/index.ts`: criar/regenerar Checkout da recorrência.
- `supabase/functions/stripe-connected-webhook/index.ts`: endpoint Connect e dispatch idempotente.
- `supabase/functions/reconcile-connected-stripe/index.ts`: recuperar faturas/eventos perdidos por conta.
- `supabase/functions/generate-recurring-sales/index.ts`: gerar ciclos manuais vencidos.
- `supabase/functions/_shared/stripe-recurring.test.ts`: testes Deno para metadata, valores e estados.

### Cliente e interface

- `src/hooks/useStripeConnection.ts`: estado e ações de conexão.
- `src/components/settings/StripeIntegrationCard.tsx`: UI isolada da integração.
- `src/hooks/useStripeProductSync.ts`: estado/ação de sincronismo do produto.
- `src/components/settings/ProductStripeSync.tsx`: controlo e erros do mapeamento.
- `src/hooks/useSaleRecurrence.ts`: detalhe, ciclos e transições da recorrência.
- `src/components/sales/RecurringSaleForm.tsx`: configuração manual/Stripe na criação/edição.
- `src/components/sales/RecurringSalePanel.tsx`: estados, ciclo atual, histórico e ações.
- `src/components/sales/RecurringSalesFilters.tsx`: filtros de serviço/cobrança/produto/provedor.
- `src/lib/recurring-finance.ts`: projeções puras de faturado, por liquidar, recebido e líquido.
- `src/lib/recurring-finance.test.ts`: testes unitários das métricas.
- `src/components/finance/FinanceDateBasisSelect.tsx`: alternância competência/recebimento.

### Operações e auditoria

- `supabase/functions/audit-recurring-sales/index.ts`: relatório read-only das associações e anomalias.
- `supabase/functions/repair-recurring-sales/index.ts`: reparação idempotente e conservadora.
- `agent_docs/recurring-sales-stripe-runbook.md`: secrets, webhook Connect, cron, deploy, rollback e verificação.

---

### Tarefa 1: Fundar o domínio recorrente no PostgreSQL

**Ficheiros:**

- Criar: `supabase/migrations/20260812120000_recurring_sales_domain.sql`
- Criar: `supabase/tests/recurring_sales_domain.sql`
- Criar: `src/types/recurring-sales.ts`
- Modificar: `src/integrations/supabase/types.ts`

**Interfaces:**

- Produz tabelas `stripe_connections`, `stripe_product_mappings`, `sale_recurrences`, `sale_recurring_cycles`, `stripe_events`.
- Produz `sale_payments.recurring_cycle_id`, `stripe_gross_amount`, `stripe_fee_amount`, `stripe_net_amount`.
- Produz RPCs `create_recurring_cycle(p_recurrence_id uuid, p_period_start date)` e `transition_sale_recurrence(p_recurrence_id uuid, p_action text)`.
- Produz tipos `ServiceStatus`, `BillingStatus`, `CycleStatus`, `BillingProvider`, `SaleRecurrence`, `RecurringCycle`, `StripeConnection`.

- [ ] **Passo 1: Escrever testes SQL que falham para constraints e RLS**

Criar transações que comprovem:

```sql
-- Given uma recorrência mensal e o mesmo period_start
-- When create_recurring_cycle é chamada duas vezes
-- Then retorna o mesmo ciclo e existe uma única linha.

-- Given anchor_date em 2026-01-31
-- When cria fevereiro, março e abril
-- Then os inícios são 2026-02-28, 2026-03-31 e 2026-04-30.

-- Given ciclo failed
-- When o billing_status é recalculado
-- Then service_status permanece active e billing_status fica past_due.

-- Given dois utilizadores de organizações diferentes
-- When o segundo seleciona/atualiza a recorrência do primeiro
-- Then não recebe nem altera linhas.
```

- [ ] **Passo 2: Executar os testes e confirmar falha por objetos inexistentes**

Executar numa base Supabase descartável/local:

```bash
supabase db reset
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recurring_sales_domain.sql
```

Resultado esperado: falha em `relation public.sale_recurrences does not exist`.

- [ ] **Passo 3: Criar tabelas, constraints, índices e RLS**

Definir checks com os valores exatos da especificação, FKs por organização, uniques de ciclo/fatura/evento/subscrição, e políticas usando a função existente de pertença à organização. `stripe_events` e campos técnicos de conexão não terão SELECT do cliente; uma vista segura expõe apenas estado operacional.

- [ ] **Passo 4: Implementar cálculo transacional dos ciclos**

`create_recurring_cycle` deve bloquear a recorrência (`FOR UPDATE`), calcular o fim pelo próximo aniversário mensal ancorado, inserir com `ON CONFLICT`, atualizar `last_cycle_date/next_cycle_date` e devolver a linha existente/criada. O cálculo nunca parte de `current_date + interval '1 month'`.

- [ ] **Passo 5: Implementar máquina de estados no servidor**

`transition_sale_recurrence` aceita somente `pause`, `resume`, `deactivate`, `cancel` e rejeita transições terminais/ilegais. Deve validar organização do chamador e manter cobrança independente.

- [ ] **Passo 6: Regenerar tipos e adicionar tipos de domínio readonly**

Executar o gerador de tipos usado pelo projeto contra o esquema local e atualizar `src/types/recurring-sales.ts` sem assertions não seguras.

- [ ] **Passo 7: Executar testes SQL e typecheck**

```bash
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recurring_sales_domain.sql
npx tsc --noEmit
```

Esperado: todos os casos SQL completam e TypeScript sai 0.

- [ ] **Passo 8: Commit atómico**

```bash
git add supabase/migrations/20260812120000_recurring_sales_domain.sql supabase/tests/recurring_sales_domain.sql src/types/recurring-sales.ts src/integrations/supabase/types.ts
git commit -m "Feat: cria dominio de ciclos de vendas recorrentes"
```

---

### Tarefa 2: Migrar compatibilidade sem alterar dinheiro histórico

**Ficheiros:**

- Criar: `supabase/migrations/20260812121000_recurring_sales_compatibility.sql`
- Modificar: `src/hooks/useRecurringSales.ts`
- Modificar: `src/hooks/useSalePayments.ts`

**Interfaces:**

- Consome tabelas e RPCs da Tarefa 1.
- Produz vista `sales_with_recurrence` para leitura gradual.
- Produz RPC `ensure_sale_recurrence_from_legacy(p_sale_id uuid)` idempotente.

- [ ] **Passo 1: Acrescentar testes SQL de backfill que falham**

Fixtures devem incluir venda recorrente ativa com data, ativa sem data, cancelada e venda não recorrente. Confirmar uma recorrência por venda, preservação do valor e nenhum `sale_payments` apagado/modificado.

- [ ] **Passo 2: Implementar backfill determinístico**

Mapear `has_recurring`, `recurring_value`, `recurring_status`, `next_renewal_date` e `last_renewal_date`. Datas ausentes ficam explicitamente sinalizadas para auditoria; não inventar uma competência para Stripe.

- [ ] **Passo 3: Criar vista de compatibilidade e adaptar hooks**

`useRecurringSales` passa a consultar a recorrência/ciclo; remover a escrita direta de pagamento e `addMonths(new Date(), 1)`. `useSalePayments` expõe `recurring_cycle_id` e valores Stripe separados.

- [ ] **Passo 4: Executar testes e typecheck**

```bash
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recurring_sales_domain.sql
npx tsc --noEmit
```

- [ ] **Passo 5: Commit atómico**

```bash
git add supabase/migrations/20260812121000_recurring_sales_compatibility.sql src/hooks/useRecurringSales.ts src/hooks/useSalePayments.ts
git commit -m "Feat: migra recorrencias antigas sem alterar pagamentos"
```

---

### Tarefa 3: Implementar Stripe Connect por organização

**Ficheiros:**

- Criar: `supabase/functions/_shared/stripe-connect.ts`
- Criar: `supabase/functions/stripe-connect/index.ts`
- Criar: `src/hooks/useStripeConnection.ts`
- Criar: `src/components/settings/StripeIntegrationCard.tsx`
- Modificar: `src/components/settings/IntegrationsContent.tsx`
- Modificar: `supabase/config.toml`

**Interfaces:**

- `stripe-connect` aceita ações `status`, `authorize`, `callback`, `disconnect`.
- `authorize` produz `{ url: string }`; `status` produz `StripeConnectionSummary`; callback redireciona para `/settings?stripe=connected|error`.
- `getConnectedStripeContext(organizationId)` produz `{ stripeAccountId, mode }` apenas para ligações ativas.

- [ ] **Passo 1: Escrever testes de state e autorização que falham**

Testar state válido/expirado/reutilizado, callback para outra organização, utilizador sem permissão e conexão desligada. O teste deve distinguir `test` de `live`.

- [ ] **Passo 2: Implementar state de uso único**

Guardar apenas hash, organização, utilizador, modo e expiração numa tabela técnica protegida; consumir atomicamente no callback.

- [ ] **Passo 3: Implementar OAuth Standard read_write**

Usar `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_SECRET_KEY` e URL HTTPS canónica. Guardar `stripe_account_id`, capacidades e estado, nunca access token no frontend. Desligar via endpoint OAuth e preservar histórico.

- [ ] **Passo 4: Implementar hook e cartão isolado**

O cartão mostra `Não ligado`, `Ligado`, `Restrições` ou `Erro`, modo teste/produção e conta mascarada. A ação abre a URL oficial; desligar exige confirmação.

- [ ] **Passo 5: Integrar o cartão sem ampliar `Settings.tsx`**

Adicionar `stripe` ao catálogo visual de `IntegrationsContent`, mas fazer a lógica inteira residir em `StripeIntegrationCard.tsx`. Não usar o antigo booleano `integrations_enabled.stripe` como fonte de verdade.

- [ ] **Passo 6: Verificar build e fluxo local**

```bash
npx tsc --noEmit
npm run build
```

Usar conta Stripe test conectada; confirmar callback, refresh de estado e desligar.

- [ ] **Passo 7: Commit atómico**

```bash
git add supabase/functions/_shared/stripe-connect.ts supabase/functions/stripe-connect/index.ts src/hooks/useStripeConnection.ts src/components/settings/StripeIntegrationCard.tsx src/components/settings/IntegrationsContent.tsx supabase/config.toml
git commit -m "Feat: liga Stripe por organizacao"
```

---

### Tarefa 4: Sincronizar produtos e preços Stripe

**Ficheiros:**

- Criar: `supabase/functions/stripe-product-sync/index.ts`
- Criar: `src/hooks/useStripeProductSync.ts`
- Criar: `src/components/settings/ProductStripeSync.tsx`
- Modificar: `src/components/settings/CreateProductModal.tsx`
- Modificar: `src/components/settings/EditProductModal.tsx`
- Modificar: `src/components/settings/ProductsTab.tsx`
- Modificar: `src/hooks/useProducts.ts`
- Modificar: `src/types/proposals.ts`
- Modificar: `supabase/config.toml`

**Interfaces:**

- `stripe-product-sync` aceita `{ action: 'enable'|'sync'|'disable', productId: string }`.
- Produz `ProductStripeMappingSummary` com `status`, `stripeProductId`, `stripePriceId`, `syncedAt`, `syncError`.

- [ ] **Passo 1: Escrever testes de sincronismo que falham**

Com fake HTTP Stripe no nível da API, provar criação inicial, update de nome/descrição, novo Price quando centavos mudam, ausência de novo Price quando só o nome muda e bloqueio sem conexão ativa.

- [ ] **Passo 2: Implementar boundary validada e idempotency keys**

Validar produto pertence à organização, é recorrente, ativo e tem preço EUR positivo. Usar chaves `product:<org>:<product>` e `price:<org>:<product>:<amount>`.

- [ ] **Passo 3: Implementar troca de preço sem proração**

Criar Price novo, atualizar subscrições ligadas com `proration_behavior=none` e manter o antigo apenas para histórico; confirmar o mapeamento somente depois de todas as chamadas essenciais concluírem.

- [ ] **Passo 4: Integrar formulários e catálogo**

Mostrar `Sincronizar com Stripe` somente quando recorrente. Sem conexão, explicar e ligar para Definições. Exibir badges `Sincronizado`, `Pendente` e `Erro`, com repetir.

- [ ] **Passo 5: Verificar testes, typecheck e build**

```bash
deno test supabase/functions/stripe-product-sync
npx tsc --noEmit
npm run build
```

- [ ] **Passo 6: Commit atómico**

```bash
git add supabase/functions/stripe-product-sync src/hooks/useStripeProductSync.ts src/components/settings/ProductStripeSync.tsx src/components/settings/CreateProductModal.tsx src/components/settings/EditProductModal.tsx src/components/settings/ProductsTab.tsx src/hooks/useProducts.ts src/types/proposals.ts supabase/config.toml
git commit -m "Feat: sincroniza produtos e precos com Stripe"
```

---

### Tarefa 5: Criar venda recorrente e Checkout ligado à venda

**Ficheiros:**

- Criar: `supabase/functions/stripe-sale-checkout/index.ts`
- Criar: `src/components/sales/RecurringSaleForm.tsx`
- Criar: `src/hooks/useSaleRecurrence.ts`
- Modificar: `src/components/sales/CreateSaleModal.tsx`
- Modificar: `src/components/sales/EditSaleModal.tsx`
- Modificar: `src/hooks/useSales.ts`
- Modificar: `supabase/config.toml`

**Interfaces:**

- Criar venda chama RPC transacional `create_sale_with_recurrence` com venda, itens recorrentes, provider e âncora.
- `stripe-sale-checkout` aceita `{ recurrenceId: string }` e produz `{ checkoutUrl, expiresAt }`.
- Metadata em Customer, Checkout e Subscription contém `organization_id`, `sale_id`, `recurrence_id`.

- [ ] **Passo 1: Escrever testes da operação transacional que falham**

Provar rollback quando itens falham, uma recorrência ativa por venda, provider Stripe bloqueado com produto não sincronizado e regeneração sem criar nova recorrência.

- [ ] **Passo 2: Implementar RPC de criação atómica**

Mover a criação crítica de venda/itens/recorrência para PostgreSQL. O cliente deixa de fazer uma sequência parcial de inserts.

- [ ] **Passo 3: Implementar Checkout subscription**

Resolver Customer pela metadata/ID guardado, não por procura global de e-mail. Usar Prices dos itens escolhidos, `client_reference_id = sale_id` e metadata completa. Regenerar apenas substitui `stripe_checkout_session_id`.

- [ ] **Passo 4: Extrair formulário recorrente das modais grandes**

`RecurringSaleForm` controla provider, data âncora e itens recorrentes. “Cobrar com Stripe” só habilita com conexão ativa e todos os itens selecionados sincronizados.

- [ ] **Passo 5: Expor link copiável após criação**

Depois da venda Stripe, mostrar diálogo com copiar link, abrir Checkout e regenerar. Venda manual fecha normalmente.

- [ ] **Passo 6: Executar testes e build**

```bash
deno test supabase/functions/stripe-sale-checkout
npx tsc --noEmit
npm run build
```

- [ ] **Passo 7: Commit atómico**

```bash
git add supabase/functions/stripe-sale-checkout src/components/sales/RecurringSaleForm.tsx src/hooks/useSaleRecurrence.ts src/components/sales/CreateSaleModal.tsx src/components/sales/EditSaleModal.tsx src/hooks/useSales.ts supabase/config.toml
git commit -m "Feat: gera Checkout para venda recorrente"
```

---

### Tarefa 6: Processar faturas Stripe por ciclo e valor bruto

**Ficheiros:**

- Criar: `supabase/functions/_shared/stripe-recurring.ts`
- Criar: `supabase/functions/_shared/stripe-recurring.test.ts`
- Criar: `supabase/functions/stripe-connected-webhook/index.ts`
- Modificar: `supabase/config.toml`

**Interfaces:**

- `parseRecurringMetadata(input)` produz IDs validados ou erro tipado.
- `materializeInvoiceCycle(invoice, accountId)` produz/atualiza um ciclo por `stripe_invoice_id`.
- `settleInvoiceCycle(invoice, balanceTransaction)` marca ciclo/pagamento usando bruto, taxa e líquido.

- [ ] **Passo 1: Escrever testes de eventos que falham**

Cobrir `checkout.session.completed`, `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`, repetição e ordem `paid` antes de `created`.

- [ ] **Passo 2: Implementar verificação Connect**

Validar assinatura no corpo bruto com `STRIPE_CONNECT_WEBHOOK_SECRET`; resolver organização por `event.account`; rejeitar metadata de outra organização.

- [ ] **Passo 3: Implementar livro de eventos idempotente**

Inserir `stripe_events` antes do dispatch, adquirir estado `processing` atomicamente, incrementar tentativas e terminar em `processed`, `failed` ou `ignored`.

- [ ] **Passo 4: Implementar materialização e liquidação**

Invoice cria ciclo `pending`; falha muda para `failed` e recorrência para `past_due`; paid muda ciclo/pagamento para `paid`, guarda bruto/taxa/líquido e restaura `current` somente se não houver outro ciclo vencido.

- [ ] **Passo 5: Preservar serviço ativo em incumprimento**

Os handlers de falha/subscription `past_due` não escrevem `service_status`. Cancelamento remoto só altera serviço quando foi pedido pelo CRM ou a subscrição chega a estado terminal confirmado.

- [ ] **Passo 6: Executar testes Deno**

```bash
deno test supabase/functions/_shared/stripe-recurring.test.ts
```

- [ ] **Passo 7: Commit atómico**

```bash
git add supabase/functions/_shared/stripe-recurring.ts supabase/functions/_shared/stripe-recurring.test.ts supabase/functions/stripe-connected-webhook/index.ts supabase/config.toml
git commit -m "Feat: liquida ciclos por webhooks Stripe Connect"
```

---

### Tarefa 7: Automatizar ciclos manuais e reconciliação Stripe

**Ficheiros:**

- Criar: `supabase/functions/generate-recurring-sales/index.ts`
- Criar: `supabase/functions/reconcile-connected-stripe/index.ts`
- Criar: `supabase/migrations/20260812122000_recurring_sales_crons.sql`
- Modificar: `supabase/config.toml`

**Interfaces:**

- `generate-recurring-sales` chama o RPC da Tarefa 1 para recorrências manuais vencidas.
- `reconcile-connected-stripe` pagina Invoices recentes por conta e reutiliza `materializeInvoiceCycle/settleInvoiceCycle`.
- Crons usam `x-cron-secret` obtido do Vault e funções verificadoras sem expor o segredo.

- [ ] **Passo 1: Escrever testes de atraso/catch-up que falham**

Uma recorrência dois meses atrasada deve produzir exatamente os dois ciclos ausentes; segunda execução não cria nada. Pausada/inativa/cancelada não gera ciclos.

- [ ] **Passo 2: Implementar geração manual em lotes**

Selecionar com `FOR UPDATE SKIP LOCKED`, limitar lote e repetir datas até `current_date`, sem saltar ciclos.

- [ ] **Passo 3: Implementar reconciliação por conta**

Paginar faturas dos últimos 35 dias, restringir a metadata Senvia, comparar estado remoto atual e reaproveitar o mesmo processador do webhook.

- [ ] **Passo 4: Agendar e proteger crons**

Agendar geração diária antes do expediente e reconciliação após a janela atual; `verify_jwt=false` apenas porque a função valida `x-cron-secret` internamente.

- [ ] **Passo 5: Verificar repetição real em ambiente de teste**

Executar cada função duas vezes; comparar contagens de ciclos/pagamentos/eventos e confirmar zero duplicações.

- [ ] **Passo 6: Commit atómico**

```bash
git add supabase/functions/generate-recurring-sales supabase/functions/reconcile-connected-stripe supabase/migrations/20260812122000_recurring_sales_crons.sql supabase/config.toml
git commit -m "Feat: automatiza renovacoes e reconciliacao Stripe"
```

---

### Tarefa 8: Substituir o detalhe antigo por painel de recorrência por ciclo

**Ficheiros:**

- Criar: `src/components/sales/RecurringSalePanel.tsx`
- Criar: `src/components/sales/RecurringCycleList.tsx`
- Modificar: `src/components/sales/SaleDetailsModal.tsx`
- Modificar: `src/components/sales/EditSaleModal.tsx`
- Remover após substituição: `src/components/sales/RecurringSection.tsx`

**Interfaces:**

- Consome `useSaleRecurrence(saleId)` da Tarefa 5.
- Produz ações pause/resume/deactivate/cancel via RPC e regenerar Checkout via função.

- [ ] **Passo 1: Criar teste de projeção/UI que falha**

Fixture da venda `0009`: valor inicial 49 €, mensalidade 54 €, quatro ciclos históricos. Confirmar que não existe “203,23 / 49 = 100%” e que taxas não reduzem a dívida liquidada.

- [ ] **Passo 2: Implementar painel de estados separados**

Mostrar valor inicial, mensalidade, `service_status`, `billing_status`, ciclo atual, próxima data e Checkout. Ações exibem consequência antes de confirmar.

- [ ] **Passo 3: Implementar histórico agrupado por ciclo**

Cada linha mostra competência, valor bruto, estado, recebido em, taxa e líquido quando Stripe. Lançamentos sem ciclo ficam numa secção “Histórico anterior”.

- [ ] **Passo 4: Retirar sumário acumulado das vendas recorrentes**

`SaleDetailsModal` mantém o progresso original somente para vendas não recorrentes; recorrentes usam `RecurringSalePanel`.

- [ ] **Passo 5: Verificar desktop e móvel**

Executar a aplicação, abrir venda recorrente e testar 1440×900, 768×1024 e 390×844; capturar evidência das três larguras.

- [ ] **Passo 6: Executar build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Passo 7: Commit atómico**

```bash
git add src/components/sales/RecurringSalePanel.tsx src/components/sales/RecurringCycleList.tsx src/components/sales/SaleDetailsModal.tsx src/components/sales/EditSaleModal.tsx src/components/sales/RecurringSection.tsx
git commit -m "Fix: mostra recorrencias por ciclo na venda"
```

---

### Tarefa 9: Adicionar classificação e filtros operacionais de vendas ativas

**Ficheiros:**

- Criar: `src/components/sales/RecurringSalesFilters.tsx`
- Modificar: `src/pages/Sales.tsx`
- Modificar: `src/hooks/useSales.ts`
- Modificar: `src/types/sales.ts`

**Interfaces:**

- `useSales` devolve `recurrence`, `recurring_product_ids` e resumo de cobrança.
- Filtros persistidos: `serviceStatus`, `billingStatus`, `billingProvider`, `productId`.

- [ ] **Passo 1: Escrever teste puro de filtros que falha**

Vendas de Tráfego Pago: uma ativa/em atraso deve continuar no filtro `serviceStatus=active`; uma inativa deve sair; filtro `billingStatus=past_due` encontra apenas a primeira.

- [ ] **Passo 2: Extrair predicado tipado de filtro**

Criar função pura no componente/módulo de filtros para evitar ampliar o `useMemo` de `Sales.tsx` e permitir os testes.

- [ ] **Passo 3: Integrar filtros e badges na lista**

Mostrar mensalidade, serviço e cobrança apenas quando recorrente. Produto usa IDs de `sale_items`, não texto de notas.

- [ ] **Passo 4: Verificar consulta usada por agentes**

Expor vista/RPC documentada que aceita `organization_id`, `product_id` e `service_status`, mantendo RLS. Confirmar que dívida em atraso não remove serviço ativo.

- [ ] **Passo 5: Executar testes e build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Passo 6: Commit atómico**

```bash
git add src/components/sales/RecurringSalesFilters.tsx src/pages/Sales.tsx src/hooks/useSales.ts src/types/sales.ts
git commit -m "Feat: filtra vendas recorrentes por estado e produto"
```

---

### Tarefa 10: Corrigir métricas e filtros do financeiro

**Ficheiros:**

- Criar: `src/lib/recurring-finance.ts`
- Criar: `src/lib/recurring-finance.test.ts`
- Criar: `src/components/finance/FinanceDateBasisSelect.tsx`
- Modificar: `src/hooks/useAllPayments.ts`
- Modificar: `src/hooks/useFinanceStats.ts`
- Modificar: `src/pages/finance/Payments.tsx`
- Modificar: `src/types/finance.ts`

**Interfaces:**

- `projectRecurringFinance(input, range)` produz `billed`, `outstanding`, `received`, `stripeFees`, `netCash`.
- `FinanceDateBasis` é `billing_period | payment_date`.

- [ ] **Passo 1: Escrever testes financeiros que falham**

Casos obrigatórios:

```typescript
// Venda inicial 49 em março; ciclos 49, 49, 54, 54.
// Agosto faturado inclui apenas o ciclo cuja competência inicia em agosto.
// Recebido em julho inclui pagamento de 30/07 mesmo quando cobre agosto.
// Fatura 54 com taxa 1,44 resulta dívida paga 54, taxa 1,44 e caixa líquido 52,56.
// Ciclo failed conta em outstanding, não em received.
```

- [ ] **Passo 2: Executar o teste e confirmar os totais antigos incorretos**

Usar Vitest se já instalado; caso contrário adicionar `vitest` como dev dependency e script `test:unit`, sem trocar o package manager/lockfile do projeto.

- [ ] **Passo 3: Implementar projeções puras**

Não inferir renovação pela “primeira payment paga”; faturado vem de ciclos e venda inicial separadamente. Dívida usa ciclo, recebido usa pagamento.

- [ ] **Passo 4: Adaptar queries e seleção de data**

`useAllPayments` inclui ciclo/recorrência. Financeiro permite “Mês faturado” e “Data de recebimento”, mostrando “Cobre agosto; recebido em 30 de julho”.

- [ ] **Passo 5: Executar testes, typecheck e build**

```bash
npm run test:unit -- src/lib/recurring-finance.test.ts
npx tsc --noEmit
npm run build
```

- [ ] **Passo 6: Commit atómico**

```bash
git add package.json package-lock.json src/lib/recurring-finance.ts src/lib/recurring-finance.test.ts src/components/finance/FinanceDateBasisSelect.tsx src/hooks/useAllPayments.ts src/hooks/useFinanceStats.ts src/pages/finance/Payments.tsx src/types/finance.ts
git commit -m "Fix: calcula financeiro recorrente por competencia"
```

---

### Tarefa 11: Auditar e reparar dados reais de forma conservadora

**Ficheiros:**

- Criar: `supabase/functions/audit-recurring-sales/index.ts`
- Criar: `supabase/functions/repair-recurring-sales/index.ts`
- Criar: `agent_docs/recurring-sales-repair-report.md` (gerado sem PII)
- Modificar: `supabase/config.toml`

**Interfaces:**

- Auditoria aceita `{ organizationId?: string, saleId?: string }` e produz contagens/códigos técnicos, sem nomes/e-mails.
- Reparação aceita `{ dryRun: boolean, organizationId?: string, saleId?: string }` e devolve ações `linked`, `created_cycle`, `backfilled_amounts`, `ambiguous`, `unchanged`.

- [ ] **Passo 1: Implementar auditoria read-only e executar dry-run**

Listar recorrências sem data, ciclos ausentes, ciclos sobrepostos, faturas sem ciclo, payments líquidos usados como dívida e associações sem metadata.

- [ ] **Passo 2: Criar fixtures de reparação e teste idempotente**

Incluir a venda `2384c986-c897-4d1f-a341-3c06c2f2fe3b` (`0009`) sem copiar nome/e-mail para artefactos. Rodar reparação duas vezes; segunda execução deve devolver somente `unchanged`.

- [ ] **Passo 3: Implementar associação por Stripe IDs confirmados**

Consultar Invoice/Subscription em test/live conforme conexão. Recuperar bruto, fee, net, período e subscription. Se dois pagamentos competirem pelo mesmo ciclo ou metadata não confirmar a venda, emitir `ambiguous` e não escrever.

- [ ] **Passo 4: Aplicar primeiro à venda 0009**

Executar `dryRun=true`, guardar resumo, depois `dryRun=false`. Verificar quatro pagamentos preservados, períodos corretos, valor inicial 49 €, mensalidade atual 54 €, e próximo ciclo consistente com Stripe.

- [ ] **Passo 5: Aplicar por organização em lotes pequenos**

Repetir dry-run/aplicação, verificar contagens antes/depois e registar somente IDs/códigos e ações no relatório.

- [ ] **Passo 6: Commit atómico**

```bash
git add supabase/functions/audit-recurring-sales supabase/functions/repair-recurring-sales agent_docs/recurring-sales-repair-report.md supabase/config.toml
git commit -m "Fix: repara historico de vendas recorrentes"
```

---

### Tarefa 12: Documentar operação, validar ponta a ponta e preparar handoff

**Ficheiros:**

- Criar: `agent_docs/recurring-sales-stripe-runbook.md`
- Modificar somente se necessário: `README.md`

**Interfaces:**

- Runbook lista secrets `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_CONNECT_REDIRECT_URI` e `stripe_cron_secret` no Vault.
- Runbook documenta endpoint Connect, eventos, deploy, saúde, reconciliação, rollback e reparação.

- [ ] **Passo 1: Documentar configuração e rollback**

Incluir ordem exata: migrations → shared/functions → secrets → Connect redirect → webhook connected accounts → crons → UI. Rollback desliga novas conexões/cobranças sem remover tabelas ou histórico.

- [ ] **Passo 2: Executar gates estáticos completos**

```bash
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
deno test supabase/functions/_shared/stripe-recurring.test.ts
node migration/scripts/verify-sql.mjs
```

Nomear separadamente falhas preexistentes; nenhuma falha nova em ficheiro alterado é aceite.

- [ ] **Passo 3: Executar cenário Stripe de ponta a ponta em modo teste**

1. Conectar conta de teste da organização.
2. Sincronizar produto recorrente “Tráfego Pago”.
3. Criar venda Stripe e copiar Checkout.
4. Pagar com cartão de teste e confirmar serviço ativo/ciclo liquidado.
5. Avançar relógio de teste ou criar renovação; confirmar segundo ciclo único.
6. Simular falha; confirmar serviço ativo, cobrança em atraso e ciclo por liquidar.
7. Repetir o webhook; confirmar contagens inalteradas.
8. Executar reconciliação; confirmar convergência sem duplicação.

- [ ] **Passo 4: Executar cenário manual**

Criar venda manual, gerar ciclo pelo cron, liquidar no Financeiro, pausar, confirmar ausência de novo ciclo, reativar e confirmar retorno na próxima âncora.

- [ ] **Passo 5: Executar QA visual**

Aplicar `omo:visual-qa` nas telas Integrações, Produtos, Nova Venda, Detalhes, lista de Vendas e Financeiro em desktop/tablet/móvel. Resolver overflow, contraste, foco, estados vazios, loading e erro.

- [ ] **Passo 6: Validar dados reparados**

Rodar auditoria final: zero recorrências ativas sem data (exceto `pending` Stripe sem primeiro pagamento), zero duplicações de ciclo/fatura, zero pagamentos Stripe sem organização/venda quando metadata válida existe. Confirmar venda 0009 contra os critérios da especificação.

- [ ] **Passo 7: Commit de documentação**

```bash
git add agent_docs/recurring-sales-stripe-runbook.md README.md
git commit -m "Docs: documenta operacao de vendas recorrentes"
```

- [ ] **Passo 8: Revisão final antes de qualquer PR**

Usar `omo:review-work`, corrigir achados e repetir somente gates cujos inputs mudaram. Não fazer push, merge ou abrir PR sem pedido explícito do utilizador.

---

## Critério de conclusão

O trabalho termina somente quando:

- uma organização liga a própria conta Stripe existente;
- produto e preço recorrentes sincronizam e atualizam na conta correta;
- Checkout inicia uma subscrição inequivocamente ligada à venda;
- cada mês produz exatamente um ciclo financeiro;
- pagamento Stripe liquida o ciclo pelo bruto e guarda taxa/líquido separados;
- falha mantém serviço ativo e cobrança/ciclo em atraso;
- vendas manuais renovam automaticamente;
- listas/agentes filtram serviços ativos por produto;
- financeiro distingue competência de recebimento;
- a venda `0009` e restantes dados auditados ficam coerentes sem apagar recebimentos;
- build, testes, QA visual e cenários reais passam na branch `codex/recurring-sales-stripe`.
