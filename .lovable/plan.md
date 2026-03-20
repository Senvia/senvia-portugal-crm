

## Corrigir card CB — somar TODAS as linhas CB do ficheiro (matched + unmatched)

### Problema
O `cbSummary` na UI calcula CB iterando `data.commercials`, que só contém linhas **matched** a um comercial. Linhas CB sem `matched_user_id` nunca entram em `commercials` → não aparecem no card.

A coluna **"Tipo de Comissão"** do ficheiro é que indica se é CB. Precisamos somar a partir de **todas** as linhas do import ativo, não só das matched.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

Calcular o resumo CB directamente de `itemsFromActiveImport` (todas as linhas, matched + unmatched):
- Iterar todos os items do import ativo
- Fazer `parseRawRow` de cada um
- Verificar se `tipoComissao` contém "CB"
- Somar `valorReceber` (coluna "Comissão Total") dessas linhas
- Expor no `summary`: `cbFileCount`, `cbFileTotal`

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

Substituir o `cbSummary` local (que itera `data.commercials`) pelos novos campos `data.summary.cbFileCount` e `data.summary.cbFileTotal` vindos do hook.

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — calcular CB de todas as linhas do import e expor no summary
- `src/components/finance/CommissionAnalysisTab.tsx` — usar os novos campos do summary nos cards

