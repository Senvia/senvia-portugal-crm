
# Adicionar Stripe Webhook para Sincronizacao Automatica de Planos

## Objetivo
Criar uma edge function que recebe eventos do Stripe via webhook e atualiza automaticamente o plano da organizacao na base de dados, sem depender do utilizador voltar ao app.

## Como Funciona Hoje (Problema)
O plano so e atualizado quando o utilizador abre o app e o frontend chama `check-subscription`. Se o utilizador pagar e fechar o browser, o plano fica desatualizado ate ao proximo login.

## Solucao

### 1. Criar Edge Function `stripe-webhook`

Ficheiro: `supabase/functions/stripe-webhook/index.ts`

A funcao vai:
- Receber eventos POST do Stripe (sem JWT, acesso publico)
- Verificar a assinatura do webhook usando `STRIPE_WEBHOOK_SECRET`
- Processar os seguintes eventos:
  - **`checkout.session.completed`** - Cliente acabou de pagar, ativar plano
  - **`customer.subscription.updated`** - Mudanca de plano (upgrade/downgrade)
  - **`customer.subscription.deleted`** - Cancelamento, reverter para plano basico
  - **`invoice.payment_failed`** - Pagamento falhado (log para monitorizacao)

Logica principal:
1. Extrair o `customer_email` do evento Stripe
2. Encontrar o utilizador na tabela `auth.users` pelo email
3. Encontrar a organizacao via `organization_members`
4. Mapear o `product_id` do Stripe para o plano (`starter`, `pro`, `elite`) usando o mesmo mapa que ja existe no `check-subscription`
5. Atualizar a coluna `plan` na tabela `organizations`

### 2. Adicionar Secret `STRIPE_WEBHOOK_SECRET`

Sera necessario configurar o webhook signing secret do Stripe. Este valor e obtido ao criar o webhook endpoint no painel do Stripe.

### 3. Registar no `config.toml`

```toml
[functions.stripe-webhook]
verify_jwt = false
```

### 4. Configuracao no Stripe (Manual pelo utilizador)

Apos o deploy da funcao, sera necessario:
1. Ir ao painel do Stripe -> Developers -> Webhooks
2. Adicionar endpoint: `https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/stripe-webhook`
3. Selecionar os eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copiar o "Signing Secret" (comeca com `whsec_...`)
5. Guardar esse secret no projeto

## Detalhes Tecnicos

### Mapeamento de Produtos (reutilizado)
```text
prod_U0wAc7Tuy8w6gA -> starter (49 EUR)
prod_U0wGoA4odOBHOZ -> pro     (99 EUR)
prod_U0wG6doz0zgZFV -> elite   (147 EUR)
```

### Fluxo do Webhook

```text
Stripe --> POST /stripe-webhook
  |
  +-- Verificar assinatura (STRIPE_WEBHOOK_SECRET)
  |
  +-- Extrair customer email
  |
  +-- Encontrar user por email (auth.users via service_role)
  |
  +-- Encontrar org via organization_members
  |
  +-- Atualizar organizations.plan
  |
  +-- Responder 200 OK ao Stripe
```

### Seguranca
- Verificacao da assinatura Stripe garante que so o Stripe pode chamar este endpoint
- Usa `SUPABASE_SERVICE_ROLE_KEY` para acesso administrativo a base de dados
- Sem JWT (o Stripe nao envia tokens de autenticacao)

## Ficheiros Afetados
- **Criar**: `supabase/functions/stripe-webhook/index.ts`
- **Sem alteracoes** nos ficheiros existentes (a funcao `check-subscription` continua a funcionar como fallback)
