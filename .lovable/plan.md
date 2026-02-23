
# Corrigir Gatilho "Subscricao Ativada" - Apenas Reativacoes

## Problema Atual

O gatilho `stripe_subscription_created` dispara em TODOS os checkouts, incluindo a primeira subscricao. Isso causa sobreposicao com os gatilhos "Bem-vindo ao Plano X", que ja cobrem o primeiro checkout.

## Comportamento Desejado

- **Primeira subscricao**: Dispara APENAS `stripe_welcome_{plan}` (Bem-vindo ao Plano X)
- **Reativacao** (pessoa que cancelou/expirou e voltou a subscrever): Dispara `stripe_subscription_created` (Subscricao Reativada)

## Logica de Detecao

No webhook, antes de disparar `stripe_subscription_created`, verificar na tabela `organizations` se a org ja tinha um plano anterior (ou seja, `plan IS NOT NULL` antes do checkout). Se o plano era `NULL` (primeira vez), e uma subscricao nova. Se ja tinha plano ou tinha `payment_failed_at` preenchido, e uma reativacao.

## Alteracoes

### 1. `supabase/functions/stripe-webhook/index.ts`

No bloco `checkout.session.completed`:

- Antes de chamar `updateOrgPlan`, verificar o plano atual da org
- Se o plano atual era `NULL` e nao havia `payment_failed_at` -> primeira subscricao, NAO disparar `stripe_subscription_created`
- Se o plano atual era `NULL` MAS havia historico (payment_failed_at ou outro indicador) -> reativacao, disparar `stripe_subscription_created`
- Os gatilhos `stripe_welcome_{plan}` continuam a disparar sempre no checkout (primeira vez e reativacoes)

Codigo relevante no bloco `checkout.session.completed`:

```text
// Verificar se e reativacao
const orgId = await findOrgByEmail(supabase, email);
let isReactivation = false;
if (orgId) {
  const { data: orgData } = await supabase
    .from("organizations")
    .select("plan, payment_failed_at")
    .eq("id", orgId)
    .maybeSingle();
  // Se ja teve plano ou teve falha de pagamento, e reativacao
  isReactivation = !!(orgData?.plan || orgData?.payment_failed_at);
}

// Dispatch apenas se for reativacao
if (isReactivation) {
  await dispatchAutomation(supabase, "stripe_subscription_created", ...);
}
// Welcome dispara sempre
if (plan) {
  await dispatchAutomation(supabase, `stripe_welcome_${plan}`, ...);
}
```

### 2. `src/hooks/useAutomations.ts`

Atualizar o label de `stripe_subscription_created` de "Subscricao Ativada" para "Subscricao Reativada" para refletir o comportamento correto.

### Ficheiros Alterados

1. `supabase/functions/stripe-webhook/index.ts` - Logica de detecao de reativacao
2. `src/hooks/useAutomations.ts` - Renomear label do gatilho
