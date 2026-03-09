## Recorrência de Vendas de Plano — Ativar apenas após pagamento Stripe

### Estado: ✅ Implementado

### Alterações Realizadas

**1. `src/types/sales.ts`**
- Adicionado `'pending'` ao tipo `RecurringStatus`
- Adicionado label "Pendente" e cor azul para o novo estado

**2. `src/hooks/useSales.ts`**
- Atualizado tipos de `recurring_status` para incluir `'pending'`

**3. `src/components/sales/CreateSaleModal.tsx`**
- Vendas de plano (`isPlanSale`) agora criadas com `recurring_status: 'pending'` em vez de `'active'`
- `next_renewal_date` fica `undefined` para vendas de plano (sem data até pagamento real)

**4. `supabase/functions/stripe-webhook/index.ts` — `handleInvoicePaid`**
- Ao atualizar a venda vinculada, também define:
  - `recurring_status: 'active'`
  - `next_renewal_date: periodEnd` (data real do Stripe)
