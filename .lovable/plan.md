
# Listas Automaticas Stripe (Senvia Agency)

## Resumo

Criar listas de transmissao automaticas relacionadas com eventos Stripe, exclusivas para a organizacao Senvia Agency. Os clientes do SENVIA OS serao automaticamente movidos entre listas conforme o estado da sua subscricao muda.

## Listas a Criar

| Nome da Lista | Descricao |
|---|---|
| Plano Starter | Clientes com subscricao Starter ativa |
| Plano Pro | Clientes com subscricao Pro ativa |
| Plano Elite | Clientes com subscricao Elite ativa |
| Pagamento em Atraso | Clientes com pagamento falhado ou past_due |
| Subscricao Cancelada | Clientes que cancelaram a subscricao |

## Comportamento Automatico

- **Novo checkout (qualquer plano)**: Contacto entra na lista do plano correspondente (Starter/Pro/Elite). Removido de "Pagamento em Atraso" e "Subscricao Cancelada".
- **Subscricao renovada**: Contacto entra na lista do plano. Removido de "Pagamento em Atraso".
- **Pagamento falhado / past_due**: Contacto entra em "Pagamento em Atraso". Permanece na lista do plano.
- **Subscricao cancelada**: Contacto removido da lista do plano. Adicionado a "Subscricao Cancelada". Removido de "Pagamento em Atraso".
- **Upgrade/downgrade**: Contacto removido do plano antigo, adicionado ao plano novo.

## Alteracoes Tecnicas

### 1. Funcao SQL: `ensure_stripe_auto_lists` (Migracao)

Similar a `ensure_org_auto_lists`, cria as 5 listas Stripe com `is_system = true` para a org Senvia Agency.

```text
CREATE OR REPLACE FUNCTION public.ensure_stripe_auto_lists(p_org_id uuid)
RETURNS void ...
-- Insere as 5 listas se nao existirem
-- Plano Starter, Plano Pro, Plano Elite, Pagamento em Atraso, Subscricao Cancelada
```

Executar `SELECT ensure_stripe_auto_lists('06fe9e1d-...')` na migracao para criar as listas imediatamente.

### 2. `supabase/functions/stripe-webhook/index.ts`

Adicionar uma funcao helper `syncStripeAutoLists` que:

1. Faz upsert do contacto na tabela `marketing_contacts` (usando email)
2. Chama `ensure_stripe_auto_lists` para garantir que as listas existem
3. Conforme o evento, adiciona/remove o contacto das listas certas

Sera chamada apos cada evento processado, com os parametros:
- `email` do cliente
- `plan` atual (starter/pro/elite/null)
- `eventType` (checkout, renewed, past_due, canceled, payment_failed)

Logica por evento:

```text
checkout_completed / renewed:
  -> Adicionar a lista "Plano {X}"
  -> Remover de "Pagamento em Atraso"
  -> Remover de "Subscricao Cancelada"
  -> Remover de outras listas de plano (se upgrade/downgrade)

past_due / payment_failed:
  -> Adicionar a "Pagamento em Atraso"

subscription_deleted:
  -> Remover de todas as listas de plano
  -> Remover de "Pagamento em Atraso"
  -> Adicionar a "Subscricao Cancelada"
```

### 3. Sem alteracoes no frontend

As listas aparecem automaticamente na pagina de Listas de Transmissao com o badge "Sistema" (ja existente para listas `is_system = true`). Nao podem ser eliminadas pelo utilizador.

## Ficheiros Alterados

1. **Nova migracao SQL** - Criar funcao `ensure_stripe_auto_lists` + popular listas para Senvia Agency
2. **`supabase/functions/stripe-webhook/index.ts`** - Adicionar logica de sincronizacao de listas automaticas
