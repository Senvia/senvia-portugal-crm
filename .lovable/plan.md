

## Problema Identificado

Quando uma venda de plano Senvia (`isPlanSale`) é criada, o código na linha 592-598 do `CreateSaleModal.tsx` força:
- `has_recurring: true`
- `recurring_status: 'active'`
- `recurring_value: 0` (porque o total é 0)
- `next_renewal_date: saleDate + 1 mês`

Ou seja, a recorrência é marcada como **ativa** imediatamente, mesmo que o cliente ainda esteja em trial e nunca tenha pago. O Daniel Moreira aparece com renovação a 8 de abril porque a venda foi criada ~8 de março com `addMonths(saleDate, 1)`.

## Solução

Para vendas de plano, a recorrência só deve ficar ativa após o primeiro pagamento no Stripe.

### 1. `src/components/sales/CreateSaleModal.tsx` (linhas 592-598)
- Quando `isPlanSale`, criar a venda com:
  - `has_recurring: true` (manter, para saber que é recorrente)
  - `recurring_status: 'pending'` em vez de `'active'`
  - `recurring_value: 0`
  - `next_renewal_date: undefined` (sem data até o Stripe confirmar)

### 2. `supabase/functions/stripe-webhook/index.ts` — `handleInvoicePaid`
- Quando atualiza a venda vinculada, também ativar a recorrência:
  - `recurring_status: 'active'`
  - `next_renewal_date: periodEnd` (usar o `period_end` da invoice do Stripe)
- Isto garante que a recorrência só fica ativa após pagamento real

### Resultado
- Vendas de plano são criadas com recorrência **pendente** (sem data de renovação)
- Primeiro `invoice.paid` do Stripe ativa a recorrência e define a data de renovação real
- Pagamentos subsequentes atualizam a data de renovação automaticamente
- 2 ficheiros editados

