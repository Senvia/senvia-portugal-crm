## Simplificar Venda de Plano Senvia — Valor automático via Stripe

### Estado: ✅ Implementado

### Alterações Realizadas

**1. `src/components/sales/CreateSaleModal.tsx`**
- Removido dropdown de seleção de plano (`selectedPlanId`, `handlePlanSelect`, `STRIPE_PLANS` import)
- Mantido checkbox "Venda de Plano Senvia" + pesquisa de organização cliente
- Adicionada mensagem informativa: "O valor será atualizado automaticamente quando o cliente subscrever"
- Permitido valor 0€ para vendas de plano (validação ajustada)
- Forçado `has_recurring: true` sempre que `isPlanSale` (sem depender de plano selecionado)

**2. `supabase/functions/stripe-webhook/index.ts` — `handleInvoicePaid`**
- Após registar comissão, atualiza a venda vinculada com:
  - `total_value` = valor pago no Stripe
  - `recurring_value` = valor pago
  - `status` = move para `in_progress` se estava `pending`
- Cada pagamento Stripe atualiza automaticamente o valor da venda (reflete upgrades/downgrades)
