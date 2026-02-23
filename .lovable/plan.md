

# Gatilhos e Listas Automaticas para Clientes Trial

## Resumo

Criar listas de transmissao e gatilhos de automacao para clientes em periodo de trial, seguindo o mesmo padrao das listas Stripe ja implementadas. Os clientes serao automaticamente movidos entre listas conforme o seu estado de trial muda.

## Novas Listas (Senvia Agency)

| Nome da Lista | Descricao |
|---|---|
| Clientes em Trial | Organizacoes atualmente em periodo de teste gratuito |
| Trial Expirado | Organizacoes cujo trial expirou sem subscrever um plano |

## Novos Gatilhos de Automacao

| Gatilho | Descricao |
|---|---|
| `trial_started` | Disparado quando uma nova organizacao e criada (inicio do trial de 14 dias) |
| `trial_expiring_3d` | Disparado 3 dias antes do trial expirar (ja existe via trial-expiry-reminders, agora tambem como gatilho de automacao) |
| `trial_expiring_1d` | Disparado 1 dia antes do trial expirar |
| `trial_expired` | Disparado quando o trial expira sem subscricao |

## Comportamento Automatico das Listas

- **Nova organizacao criada**: Contacto (email do admin) entra em "Clientes em Trial"
- **Trial expira sem plano**: Contacto sai de "Clientes em Trial", entra em "Trial Expirado"
- **Cliente subscreve plano (checkout)**: Contacto removido de "Clientes em Trial" e "Trial Expirado" (ja entra na lista do plano correspondente pela logica existente)

## Alteracoes Tecnicas

### 1. Migracao SQL

Atualizar a funcao `ensure_stripe_auto_lists` para incluir as 2 novas listas de trial:

```text
INSERT INTO client_lists (organization_id, name, description, is_dynamic, is_system)
SELECT p_org_id, 'Clientes em Trial', 'Organizacoes em periodo de teste gratuito', false, true
WHERE NOT EXISTS (...);

INSERT INTO client_lists (organization_id, name, description, is_dynamic, is_system)
SELECT p_org_id, 'Trial Expirado', 'Organizacoes cujo trial expirou sem plano', false, true
WHERE NOT EXISTS (...);
```

Executar imediatamente para a org Senvia Agency.

### 2. `supabase/functions/stripe-webhook/index.ts`

No bloco `checkout.session.completed`, apos a logica existente de `syncStripeAutoLists`, adicionar remocao do contacto das listas de trial ("Clientes em Trial" e "Trial Expirado"). Atualizar a funcao `syncStripeAutoLists` para incluir estas listas no mapa e remove-las nos eventos `checkout_completed` e `renewed`.

### 3. `src/hooks/useAutomations.ts`

Adicionar os novos gatilhos na lista `STRIPE_TRIGGER_TYPES`:

```text
{ value: 'trial_started', label: 'Trial Iniciado' }
{ value: 'trial_expiring_3d', label: 'Trial Expira em 3 Dias' }
{ value: 'trial_expiring_1d', label: 'Trial Expira em 1 Dia' }
{ value: 'trial_expired', label: 'Trial Expirado' }
```

### 4. Funcao SQL: `create_organization_for_current_user`

Atualizar para, apos criar a organizacao, fazer dispatch da automacao `trial_started` e adicionar o contacto a lista "Clientes em Trial" na org Senvia Agency. Isto sera feito via `pg_net` (chamada HTTP a edge function `process-automation`), seguindo o padrao existente dos triggers de leads.

**Alternativa mais simples**: Criar um trigger SQL `AFTER INSERT ON organizations` que usa `pg_net` para chamar uma nova edge function ou a `process-automation` com `trigger_type = 'trial_started'`.

### 5. Edge function `cleanup-expired-trials/index.ts`

Antes de eliminar os dados, adicionar logica para:
- Disparar automacao `trial_expired` para cada org expirada
- Mover o contacto de "Clientes em Trial" para "Trial Expirado" na org Senvia Agency

**Nota**: O `cleanup-expired-trials` corre 60 dias apos a expiracao. Para o gatilho `trial_expired` ser util (comunicacao imediata), precisamos de um novo cron job ou adaptar o `check-subscription` para detetar trials recem-expirados.

### 6. Novo cron job: `check-trial-status` (recomendado)

Criar uma edge function `check-trial-status` executada diariamente (via pg_cron) que:
- Encontra orgs com `trial_ends_at` proximo (3 dias, 1 dia)
- Encontra orgs com `trial_ends_at` ja passado e sem plano
- Dispara os gatilhos `trial_expiring_3d`, `trial_expiring_1d`, `trial_expired`
- Atualiza as listas automaticas (move de "Clientes em Trial" para "Trial Expirado")
- Usa uma coluna JSONB `trial_reminders_sent` (ja existente) para evitar duplicados

## Ficheiros Alterados

1. **Nova migracao SQL** - Adicionar listas "Clientes em Trial" e "Trial Expirado" a `ensure_stripe_auto_lists`
2. **Nova migracao SQL** - Trigger `AFTER INSERT ON organizations` para `trial_started`
3. **`supabase/functions/stripe-webhook/index.ts`** - Remover contacto das listas trial no checkout
4. **`src/hooks/useAutomations.ts`** - Adicionar 4 novos gatilhos trial
5. **Nova edge function `check-trial-status`** - Cron diario para detetar expiracao e disparar gatilhos
6. **`supabase/config.toml`** - Registar a nova edge function (automatico)

## Fluxo Resumido

```text
Org Criada (trial 14d)
  -> Contacto entra em "Clientes em Trial"
  -> Dispara gatilho "trial_started"

3 dias antes de expirar (cron diario)
  -> Dispara gatilho "trial_expiring_3d"

1 dia antes de expirar (cron diario)
  -> Dispara gatilho "trial_expiring_1d"

Trial expirou sem plano (cron diario)
  -> Contacto sai de "Clientes em Trial"
  -> Contacto entra em "Trial Expirado"
  -> Dispara gatilho "trial_expired"

Cliente subscreve plano (Stripe checkout)
  -> Contacto removido de "Clientes em Trial" e "Trial Expirado"
  -> Entra na lista do plano (logica existente)
```
