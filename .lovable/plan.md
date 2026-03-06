

## Alterar colunas "OP" para contar Propostas (não Vendas)

### Contexto

Atualmente, as colunas **OP** (Energia, Solar, Comissão) nas secções B) Ritmo e C) Concretização vêm da tabela `sales`. O utilizador esclareceu que **OP = Propostas**, e devem contar todas as propostas que **não estejam concluídas** (excluir `accepted`, `rejected`, `expired`). Ou seja, contar propostas com status `draft`, `sent` ou `negotiating`.

As colunas de **valor** (Energia MWh, Solar kWp, Comissão €) continuam a vir das **vendas entregues** (`fulfilled`).

### Alteração

**`src/components/dashboard/MetricsPanel.tsx`**:

1. Adicionar uma query à tabela `proposals` filtrada por `organization_id`, `proposal_date` no mês, e status NOT IN (`accepted`, `rejected`, `expired`)
2. No cálculo do `ritmoRows`, separar:
   - **opEnergia**: count de proposals com `proposal_type = 'energia'` (por `created_by`)
   - **opSolar**: count de proposals com `proposal_type = 'servicos'` e `kwp > 0` (por `created_by`)
   - **opComissao**: soma de opEnergia + opSolar
   - **energia, solar, comissão**: mantêm-se das vendas `fulfilled` (query já existente com `.eq("status", "fulfilled")`)
3. Atualizar a query de sales existente para filtrar `.eq("status", "fulfilled")` (consistente com o useMonthSalesMetrics)

### Ficheiro
- `src/components/dashboard/MetricsPanel.tsx`

