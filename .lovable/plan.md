

## Adicionar cards de resumo CB na Análise de Comissões

### O que será feito

Adicionar uma secção de cards no topo da página (após os filtros, antes da tabela) que mostra um resumo dos CPEs com tipo de comissão "CB" do ficheiro importado:

1. **Card "Total CB"** — quantidade de linhas do ficheiro com `tipoComissao` contendo "CB" e soma total do campo `valorReceber` (coluna "Comissão Total" do ficheiro)
2. **Card "Total Comissão"** — quantidade e soma das linhas que NÃO são CB (para contraste)
3. **Card "Discrepâncias CB"** — quantos dos CBs têm discrepâncias com o sistema

### Implementação

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

1. Criar um `useMemo` que percorre todos os `comparisonData` de todos os `commercials` e:
   - Filtra linhas onde `row.file.tipoComissao` contém "CB" (case-insensitive)
   - Soma o `valorReceber` dessas linhas (parse numérico)
   - Conta quantas linhas CB existem
   - Conta quantas têm discrepância

2. Renderizar 2-3 cards usando o componente `MetricCard` existente (ou cards simples com `Card`) entre os filtros e a tabela:
   - **CB**: `{count} CPE(s)` + valor total formatado em €
   - **Comissões normais**: idem para não-CB
   - **Discrepâncias CB**: count de CBs com `hasAnyDiscrepancy`

### Ficheiros alterados
- `src/components/finance/CommissionAnalysisTab.tsx` — adicionar `useMemo` de agregação + cards no layout

