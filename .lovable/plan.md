

## Corrigir contagem de propostas no quadro B) Ritmo

### Problema

A query de propostas no Ritmo filtra por `["draft", "sent", "negotiating"]` (linha 85). O utilizador quer que conte apenas propostas nos estados **enviado** (`sent`) e **em negociação** (`negotiating`), excluindo rascunhos (`draft`). A deduplicação por NIF já garante que ao mudar de "enviado" para "negociação" não conta duas vezes.

Adicionalmente, os valores de Energia/Solar/Comissão no Ritmo vêm da tabela `sales` com campos directos (`consumo_anual`, `kwp`, `comissao`) — que podem estar NULL. Isto deve seguir a mesma lógica corrigida no `useMonthSalesMetrics`, buscando os dados reais de `proposal_cpes`.

### Alterações

**`src/components/dashboard/MetricsPanel.tsx`**

1. **Linha 85** — Alterar filtro de `.in("status", ["draft", "sent", "negotiating"])` para `.in("status", ["sent", "negotiating"])`

2. **Linhas 118-133** — Alterar a query de `salesRaw` para incluir `proposal_id` no select, e após obter os resultados, fazer query a `proposal_cpes` para buscar `consumo_anual` e `comissao` reais (mesma lógica do `useMonthSalesMetrics` corrigido). Buscar `kwp` de `proposals.servicos_details`.

3. **Linhas 155-161** — Usar os valores agregados dos CPEs em vez dos campos directos da tabela `sales`.

