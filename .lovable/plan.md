
# Lista Automática: Subscrição Reativada

## Resumo

Adicionar uma nova lista de sistema "Subscrição Reativada" para a organização Senvia Agency, que captura clientes que tiveram a subscrição cancelada/expirada e voltaram a subscrever.

## Nova Lista

| Nome | Descrição |
|---|---|
| Subscrição Reativada | Clientes que reativaram a subscrição após cancelamento ou expiração |

## Comportamento Automático

- **Reativação detetada (checkout com `isReactivation = true`)**: Contacto entra em "Subscrição Reativada"
- **Subscrição cancelada**: Contacto removido de "Subscrição Reativada"
- O contacto permanece simultaneamente na lista do plano correspondente (Starter/Pro/Elite)

## Alterações Técnicas

### 1. Migração SQL

Atualizar a função `ensure_stripe_auto_lists` para incluir a nova lista:

```text
('Subscrição Reativada', 'Clientes que reativaram a subscrição')
```

Executar imediatamente para a org Senvia Agency.

### 2. `supabase/functions/stripe-webhook/index.ts`

No `syncStripeAutoLists`:
- Adicionar `reactivatedListId` ao mapa de listas
- Receber um novo parâmetro `isReactivation` (boolean)
- No evento `checkout_completed`: se `isReactivation = true`, adicionar à lista "Subscrição Reativada"
- No evento `canceled`: remover da lista "Subscrição Reativada"

Atualizar a chamada a `syncStripeAutoLists` no bloco `checkout.session.completed` para passar o flag `isReactivation`.

### 3. `src/hooks/useAutomations.ts`

Já existe o gatilho `stripe_subscription_created` (label: "Subscrição Reativada") -- não precisa de alteração no frontend.

## Ficheiros Alterados

1. **Nova migração SQL** -- Adicionar "Subscrição Reativada" à função `ensure_stripe_auto_lists`
2. **`supabase/functions/stripe-webhook/index.ts`** -- Lógica de sincronização da nova lista
