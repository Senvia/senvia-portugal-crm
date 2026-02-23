

# Gatilhos de Automacao Stripe (Exclusivos Senvia Agency)

## Resumo

Adicionar gatilhos de automacao de email relacionados com eventos do Stripe. Estes gatilhos so aparecem para a organizacao "Senvia Agency" (ID: `06fe9e1d-9670-45b0-8717-c5a6e90be380`), permitindo enviar emails automaticos quando clientes do SENVIA OS ativam, renovam ou cancelam subscricoes.

## Novos Gatilhos

| Valor | Label |
|-------|-------|
| `stripe_subscription_created` | Subscricao Ativada |
| `stripe_subscription_renewed` | Subscricao Renovada |
| `stripe_subscription_canceled` | Subscricao Cancelada |
| `stripe_subscription_past_due` | Pagamento em Atraso |
| `stripe_payment_failed` | Pagamento Falhado |
| `stripe_welcome_starter` | Bem-vindo ao Plano Starter |
| `stripe_welcome_pro` | Bem-vindo ao Plano Pro |
| `stripe_welcome_elite` | Bem-vindo ao Plano Elite |

## Alteracoes Tecnicas

### 1. `src/hooks/useAutomations.ts`

- Adicionar os novos trigger types numa lista separada `STRIPE_TRIGGER_TYPES`
- Exportar ambos: `TRIGGER_TYPES` (base) e `STRIPE_TRIGGER_TYPES` (Stripe)

### 2. `src/components/marketing/CreateAutomationModal.tsx`

- Importar `useAuth` para aceder ao `organization`
- Verificar se `organization?.slug === 'senvia-agency'`
- Se sim, combinar `TRIGGER_TYPES` + `STRIPE_TRIGGER_TYPES` nas opcoes do combobox
- Se nao, mostrar apenas os `TRIGGER_TYPES` normais
- Agrupar visualmente com separador: "CRM" e "Stripe" (labels de grupo no combobox)

### 3. `src/components/marketing/AutomationsTable.tsx`

- Atualizar `getTriggerLabel` para incluir os novos tipos Stripe na resolucao de labels

### 4. `supabase/functions/stripe-webhook/index.ts`

- Apos cada evento processado (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed), chamar `supabase.functions.invoke("process-automation")` com:
  - `trigger_type`: o gatilho correspondente (ex: `stripe_subscription_created`)
  - `organization_id`: o ID da org "Senvia Agency" (`06fe9e1d-9670-45b0-8717-c5a6e90be380`)
  - `record`: dados relevantes (email do cliente, nome do plano, etc.)
- Para checkout.session.completed: disparar `stripe_subscription_created` + `stripe_welcome_{plan}`
- Para subscription.updated com status=active: disparar `stripe_subscription_renewed`
- Para subscription.updated com status=past_due: disparar `stripe_subscription_past_due`
- Para subscription.deleted: disparar `stripe_subscription_canceled`
- Para invoice.payment_failed: disparar `stripe_payment_failed`

### 5. Variaveis Disponiveis nos Templates

Os emails de automacao Stripe terao acesso a estas variaveis (passadas no `record`):

- `{{email}}` - Email do cliente
- `{{plan}}` - Nome do plano (Starter, Pro, Elite)
- `{{nome}}` - Nome da organizacao do cliente (quando disponivel)

## Seguranca

- Os gatilhos Stripe so aparecem no frontend para a org com slug `senvia-agency`
- O webhook Stripe sempre dispara automacoes com `organization_id` fixo da Senvia Agency
- Nenhuma alteracao de base de dados necessaria (os trigger_types sao apenas strings na coluna existente)

## Ficheiros Alterados

1. `src/hooks/useAutomations.ts` - Novos trigger types
2. `src/components/marketing/CreateAutomationModal.tsx` - Filtro por org + gatilhos Stripe
3. `src/components/marketing/AutomationsTable.tsx` - Labels dos novos triggers
4. `supabase/functions/stripe-webhook/index.ts` - Disparar automacoes nos eventos Stripe

