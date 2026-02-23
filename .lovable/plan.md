

# Revogar Acesso Apos 3 Dias de Pagamento Falhado

## Resumo
Quando o Stripe nao consegue cobrar a renovacao de um cliente, o sistema vai guardar a data da falha e, apos 3 dias sem pagamento, bloquear o acesso -- mostrando um ecra semelhante ao do trial expirado, mas com mensagem especifica de pagamento em atraso.

## O que muda

### 1. Nova coluna na base de dados
Adicionar `payment_failed_at` (timestamp, nullable) na tabela `organizations` para registar quando o pagamento falhou pela primeira vez.

### 2. Webhook do Stripe (stripe-webhook)
- **`invoice.payment_failed`**: Registar a data atual em `payment_failed_at` na organizacao do cliente (apenas se ainda estiver NULL, para preservar a data original da falha).
- **`customer.subscription.updated`** com status `past_due`: Mesmo comportamento -- registar se ainda nao estiver registado.
- **`checkout.session.completed`** e pagamento bem-sucedido: Limpar `payment_failed_at` (definir como NULL), pois o cliente regularizou.
- **`customer.subscription.deleted`**: Manter a logica atual (plan = null), e tambem limpar `payment_failed_at`.

### 3. Edge Function check-subscription
Retornar dois campos novos na resposta:
- `payment_failed_at`: a data da falha (se existir)
- `payment_overdue`: `true` se passaram mais de 3 dias desde `payment_failed_at`

### 4. Frontend -- ProtectedRoute
Verificar se `payment_overdue === true` e, nesse caso, mostrar um bloqueador (semelhante ao `TrialExpiredBlocker`) com:
- Mensagem: "O seu pagamento falhou ha mais de 3 dias"
- Botao para ir a pagina de billing / portal do Stripe
- Permitir acesso apenas a `/settings` (para o cliente poder regularizar)

### 5. Novo componente PaymentOverdueBlocker
Ecra de bloqueio com:
- Icone de alerta
- Data desde quando o pagamento falhou
- Botao "Regularizar Pagamento" que abre o portal do Stripe
- Botao secundario "Ver Planos" que leva a `/settings?tab=billing`

## Secao Tecnica

### Migration SQL
```sql
ALTER TABLE public.organizations
ADD COLUMN payment_failed_at timestamptz DEFAULT NULL;
```

### Fluxo do Webhook (stripe-webhook/index.ts)

```text
invoice.payment_failed
  -> Encontrar org pelo email do customer
  -> UPDATE organizations SET payment_failed_at = NOW()
     WHERE id = org_id AND payment_failed_at IS NULL

customer.subscription.updated (status = past_due)
  -> Mesmo: SET payment_failed_at = NOW() WHERE payment_failed_at IS NULL

checkout.session.completed / subscription volta a active
  -> UPDATE organizations SET payment_failed_at = NULL

customer.subscription.deleted
  -> SET plan = NULL, payment_failed_at = NULL
```

### check-subscription (resposta adicional)
```typescript
// Apos obter orgData:
const paymentOverdue = orgData?.payment_failed_at
  ? (Date.now() - new Date(orgData.payment_failed_at).getTime()) > 3 * 24 * 60 * 60 * 1000
  : false;

return { ...existingResponse, payment_failed_at: orgData?.payment_failed_at, payment_overdue: paymentOverdue };
```

### ProtectedRoute (nova condicao)
```typescript
if (hasCheckedSub && subscriptionStatus?.payment_overdue === true) {
  return <PaymentOverdueBlocker paymentFailedAt={subscriptionStatus.payment_failed_at} />;
}
```

### Ficheiros a criar/editar
| Ficheiro | Acao |
|---|---|
| Migration SQL | Nova coluna `payment_failed_at` |
| `supabase/functions/stripe-webhook/index.ts` | Tratar `invoice.payment_failed` e limpar na renovacao |
| `supabase/functions/check-subscription/index.ts` | Retornar `payment_overdue` |
| `src/hooks/useStripeSubscription.ts` | Adicionar campos novos ao tipo |
| `src/components/auth/PaymentOverdueBlocker.tsx` | Novo componente de bloqueio |
| `src/components/auth/ProtectedRoute.tsx` | Condicao de bloqueio por pagamento em atraso |

