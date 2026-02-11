

## Corrigir Botao "Adicionar Pagamento" para Considerar Agendados

### Problema

O calculo de `remaining` em `calculatePaymentSummary` usa apenas o `totalPaid` (pagamentos com status "paid"). Os pagamentos agendados (status "pending") nao sao subtraidos. Resultado: mesmo quando o valor total ja esta coberto por pagamentos agendados + pagos, o botao "Adicionar Pagamento" continua visivel.

**Codigo atual (linha 139 de `useSalePayments.ts`):**
```
const remaining = Math.max(0, saleTotal - totalPaid);
```

### Solucao

Adicionar uma nova propriedade `remainingToSchedule` ao summary que considera pagos **e** agendados. O botao "Adicionar Pagamento" passa a usar este valor em vez de `remaining`.

### Detalhes tecnicos

**Ficheiro 1:** `src/hooks/useSalePayments.ts`

- Adicionar ao retorno de `calculatePaymentSummary`:
  ```
  remainingToSchedule = Math.max(0, saleTotal - totalPaid - totalScheduled)
  ```
- `remaining` continua igual (saleTotal - totalPaid) para o resumo visual de "Em Falta" -- isto mostra quanto falta **pagar de facto**
- `remainingToSchedule` indica quanto falta **agendar ou pagar** -- controla a visibilidade do botao

**Ficheiro 2:** `src/components/sales/SalePaymentsList.tsx`

- Substituir `summary.remaining > 0` por `summary.remainingToSchedule > 0` nos dois locais onde controla a visibilidade do botao "Adicionar Pagamento" (linhas 174 e 489)
- Manter `summary.remaining` no resumo visual ("Em Falta") e no `PaymentTypeSelector` / `AddPaymentModal` para o valor pre-preenchido
