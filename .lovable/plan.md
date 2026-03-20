
## Correção para o card **Chargebacks (CB)** não ficar em zero quando o ficheiro tem CB

### Diagnóstico (confirmado)
O card está a usar dados de `itemsFromActiveImport`, que hoje passa por filtro de mês (`selectedMonth` + `Data de início`).
Resultado: se a linha CB do ficheiro estiver fora do mês selecionado, o card mostra **0**, mesmo existindo CB no import ativo.

No import ativo mais recente, existe pelo menos 1 linha com `Tipo de comissão = CB`, então o problema é de escopo de filtro, não ausência de dados.

### O que vou ajustar

1. **Separar fontes de dados no hook**
   - Manter:
     - `itemsFromActiveImportRaw` = todas as linhas do import ativo
     - `itemsFromActiveImport` = linhas filtradas por mês (para tabela/comparação)

2. **Calcular métricas dos cards com o import completo**
   - Em `src/hooks/useCommissionAnalysis.ts`, calcular:
     - `cbFileCount`
     - `cbFileTotal`
     - `comFileCount`
     - `comFileTotal`
   - usando **`itemsFromActiveImportRaw`** (sem filtro de mês), detectando CB por `Tipo de comissão`.

3. **Manter tabela comparativa com filtro mensal**
   - A comparação por comercial continua com `itemsFromActiveImport` (comportamento atual da análise por mês).

4. **UI continua consumindo `data.summary.*`**
   - Em `src/components/finance/CommissionAnalysisTab.tsx`, o card já lê `data.summary.cbFileCount/cbFileTotal`; com o hook corrigido, ele passa a refletir o ficheiro inteiro.

### Detalhes técnicos
- Arquivo principal: `src/hooks/useCommissionAnalysis.ts`
  - ponto da correção: loop de agregação dos cards (hoje usa `itemsFromActiveImport`)
  - novo comportamento: loop passa a usar `itemsFromActiveImportRaw`
- Arquivo de UI: `src/components/finance/CommissionAnalysisTab.tsx`
  - sem mudança estrutural; apenas validação de consumo dos campos já existentes no `summary`

### Resultado esperado
- O card **Chargebacks (CB)** deixa de mostrar zero indevidamente.
- Passa a mostrar a soma real das linhas CB do ficheiro importado (import ativo), independentemente do mês selecionado no filtro.
