

## Filtrar vendas do Objetivo Mensal apenas por status "fulfilled" (Entregue)

### Problema

Atualmente, o hook `useMonthSalesMetrics` conta **todas** as vendas do mês (exceto canceladas) para a secção **B) Vendas** do painel "Objetivo Mensal". O utilizador quer que apenas as vendas com status `fulfilled` ("Entregue") sejam contabilizadas.

### Solução

Alterar o filtro no hook `src/hooks/useMonthSalesMetrics.ts`:

- **Antes**: `.neq("status", "cancelled")` — inclui `in_progress`, `fulfilled` e `delivered`
- **Depois**: `.eq("status", "fulfilled")` — inclui apenas vendas "Entregue"

### Ficheiro
1. `src/hooks/useMonthSalesMetrics.ts` — linha 33: trocar `.neq("status", "cancelled")` por `.eq("status", "fulfilled")`

