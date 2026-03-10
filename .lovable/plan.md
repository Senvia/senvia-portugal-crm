

## Corrigir filtro de status em B) Vendas — apenas "Entregues"

O filtro foi alterado anteriormente para incluir `fulfilled` + `delivered`, mas o correcto para o quadro B) Vendas é apenas vendas com estado **Entregue** (`fulfilled`).

### Alteração

**`src/hooks/useMonthSalesMetrics.ts` (linha 33)**

Reverter `.in("status", ["fulfilled", "delivered"])` para `.eq("status", "fulfilled")`.

Uma linha alterada.

