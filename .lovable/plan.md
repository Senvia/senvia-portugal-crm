

## Mostrar "Tipo Comissão" (negotiation_type) na linha do Sistema

### Problema
A linha "Sistema" mostra "—" para "Tipo Comissão" e "Tipo". O `negotiation_type` já existe no `CpeDetail` mas não é passado ao `ComparisonRow`.

### Solução

#### 1) `src/hooks/useCommissionAnalysis.ts`
- Adicionar `systemNegotiationType: string | null` ao `ComparisonRow`
- No `buildComparison`, preencher com `match.negotiation_type`

#### 2) `src/components/finance/CommissionAnalysisTab.tsx`
- Importar `NEGOTIATION_TYPE_LABELS` de `@/types/proposals` (ou definir inline)
- Linha 108: substituir "—" por `NEGOTIATION_TYPE_LABELS[row.systemNegotiationType]` (ex: "Angariação")
- Linha 110 ("Tipo"): continua "—" pois não existe equivalente no sistema

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — 1 campo novo no `ComparisonRow` + 1 linha no `buildComparison`
- `src/components/finance/CommissionAnalysisTab.tsx` — exibir negotiation_type na linha Sistema

