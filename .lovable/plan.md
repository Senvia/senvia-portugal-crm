

## Simplificar Venda de Plano Senvia — Valor automático via Stripe

### Problema Atual
O comercial tem de selecionar manualmente o plano (Starter/Pro/Elite) ao criar a venda, o que define o valor. Mas na realidade, é a organização cliente que escolhe o plano. O valor da venda deveria refletir automaticamente o plano que o cliente subscreve.

### Nova Lógica
1. **No CreateSaleModal**: Remover o dropdown de seleção de plano. Manter apenas o checkbox "Venda de Plano Senvia" + pesquisa de organização cliente. O valor fica a 0€ (ou sem itens) até o cliente subscrever.
2. **No Stripe Webhook (`invoice.paid`)**: Quando o cliente paga, além de registar a comissão, **atualizar o `total_value` e `recurring_value`** da venda vinculada com o valor real pago pelo cliente. Também guardar o plano na venda (campo existente ou novo).
3. **Atualizações contínuas**: Cada `invoice.paid` atualiza o valor da venda, refletindo mudanças de plano (upgrade/downgrade).

### Alterações

**1. `src/components/sales/CreateSaleModal.tsx`**
- Remover o estado `selectedPlanId` e a função `handlePlanSelect`
- Remover o dropdown `<Select>` de plano (linhas 763-777)
- Quando `isPlanSale` é ativado, não adicionar itens automáticos — apenas exigir a organização cliente
- Remover a lógica `isPlanRecurring` baseada em `selectedPlanId`; forçar `has_recurring: true` quando `isPlanSale`
- Permitir valor 0€ para vendas de plano (remover validação `total <= 0`)

**2. `supabase/functions/stripe-webhook/index.ts` — `handleInvoicePaid`**
- Após encontrar a venda vinculada, **atualizar a venda** com:
  - `total_value` = valor pago (amount)
  - `recurring_value` = valor pago
  - `status` = manter ou mover para `in_progress` se estiver pendente
- Isto garante que a venda reflete sempre o valor real do plano

### Resultado
- Comercial: marca como "Venda de Plano Senvia", seleciona a organização → cria venda com valor 0€
- Cliente subscreve plano → webhook atualiza automaticamente o valor da venda
- Cliente muda de plano → próximo `invoice.paid` atualiza o valor
- Comissões calculadas sempre sobre o valor real pago

