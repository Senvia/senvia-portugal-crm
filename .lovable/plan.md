

# Separar Trial do Plano: Acesso Total sem "plan = elite"

## Problema

Quando um cliente esta em trial, o sistema define `plan = 'elite'` na base de dados. Isto causa:
- Adição incorreta a listas de planos pagos (ex: "Plano Elite")
- Confusao entre clientes que pagam e clientes em trial
- Problemas futuros com qualquer logica que dependa da coluna `plan`

## Solucao

Manter `plan = null` durante o trial. O acesso total e garantido verificando o estado do trial em vez de simular um plano pago.

## Alteracoes

### 1. Edge Function `check-subscription` (2 alteracoes)

Remover as duas linhas que fazem `update({ plan: 'elite' })` durante o trial (linhas 97 e 129). A resposta JSON ja retorna `on_trial: true` e `plan_id: 'elite'` para o frontend -- isto nao muda. Apenas deixa de gravar `elite` na coluna `plan` da DB.

Tambem na funcao `buildTrialResponse`, o campo `plan_id` no JSON passara a ser `null` em vez de `'elite'`. O controlo de acesso passara a ser feito pelo campo `on_trial`.

### 2. Hook `useSubscription.ts`

Atualmente le `organization.plan` (que vem da DB). Precisa de ser alterado para:
- Se o utilizador esta em trial (`on_trial === true`), carregar as features do plano `elite` da tabela `subscription_plans` (acesso total)
- Se nao, usar `organization.plan` normalmente

Isto requer acesso ao estado de trial. A abordagem mais simples: importar/consultar o `subscriptionStatus` do `useStripeSubscription` ou ler o `trial_ends_at` da organizacao.

### 3. Correcao de dados (SQL)

Atualizar organizacoes que estao em trial para ter `plan = null`:

```text
UPDATE organizations
SET plan = null
WHERE trial_ends_at > now()
  AND billing_exempt = false
  AND plan = 'elite';
```

### 4. Validar GeneralContent.tsx

O badge de plano nas definicoes gerais mostra `organization.plan`. Com `plan = null`, mostrara "Starter" (fallback). Ajustar para mostrar "Trial" quando em trial.

## Ficheiros Alterados

1. `supabase/functions/check-subscription/index.ts` -- Remover sync de plan=elite durante trial; alterar plan_id no JSON de trial
2. `src/hooks/useSubscription.ts` -- Verificar trial para conceder acesso total sem depender de plan=elite na DB
3. `src/components/settings/GeneralContent.tsx` -- Mostrar badge "Trial" quando em trial
4. SQL direto -- Limpar plan=elite de organizacoes em trial

## Resultado

- Trial: `plan = null` na DB, acesso total via logica de trial
- Pagamento Stripe: `plan = starter/pro/elite` na DB (como antes)
- Billing exempt: `plan = elite` na DB (como antes)
- Listas automaticas: nunca mais adicionam clientes em trial a listas de planos pagos

