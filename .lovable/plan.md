

## Corrigir Cards Financeiros (Dados Corretos da Senvia Agency)

### O problema real

O card "Total Faturado" calcula `totalReceived + totalPending` (pagamentos), o que esta errado porque vendas sem pagamentos registados ficam de fora. Alem disso, os cards "Recebido" e "Despesas" usam `receivedThisMonth`/`expensesThisMonth` (so este mes), enquanto os outros mostram historico total -- inconsistente.

### Dados reais da Senvia Agency (organizacao ativa)

- Vendas: 250 + 275 + 20 + 497 + 100 = **1.142 EUR**
- Pagamentos pagos: 250 + 100 + 75 + 100 + 20 + 100 = **645 EUR**
- Pagamentos pendentes: 248,50 + 248,50 = **497 EUR**
- Despesas: **0 EUR**

### O que vai mudar

**Ficheiro: `src/hooks/useFinanceStats.ts`**

1. Adicionar query a tabela `sales` filtrada por `organization_id` para buscar o valor real de vendas
2. Calcular `totalBilled` a partir de `SUM(sales.total_value)` em vez de somar pagamentos
3. Aplicar filtro de data nas vendas (pelo campo `created_at`) quando o utilizador seleciona um periodo
4. Remover campos `receivedThisMonth` e `expensesThisMonth` -- nao fazem sentido quando todos os outros cards mostram historico total
5. Alterar `balance` para `totalReceived - totalExpenses` (historico completo, consistente)

**Ficheiro: `src/types/finance.ts`**

1. Remover `receivedThisMonth` e `expensesThisMonth` da interface `FinanceStats`

**Ficheiro: `src/pages/Finance.tsx`**

1. Card "Recebido": trocar `stats.receivedThisMonth` por `stats.totalReceived`
2. Card "Recebido": label sem filtro muda de "Este mes" para "Total recebido"
3. Card "Despesas": label sem filtro muda de "Este mes" para "Total"
4. Card "Balanco": label muda para "Recebido - Despesas"

### Resultado esperado (Senvia Agency, sem filtro)

| Card | Valor | Fonte |
|------|-------|-------|
| Total Faturado | 1.142 EUR | Soma de sales.total_value (apenas Senvia Agency) |
| Recebido | 645 EUR | Pagamentos com status paid (apenas Senvia Agency) |
| Pendente | 497 EUR | Pagamentos com status pending (apenas Senvia Agency) |
| Despesas | 0 EUR | Soma de expenses (apenas Senvia Agency) |
| Balanco | 645 EUR | Recebido - Despesas |
| A Vencer (7d) | 248,50 EUR | Pendentes nos proximos 7 dias |

Todas as queries ja filtram por `organization_id` -- o isolamento multi-tenant esta correto no codigo, apenas o calculo do "Total Faturado" e as labels estavam errados.
