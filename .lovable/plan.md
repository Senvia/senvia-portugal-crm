

## Problema identificado

A importação funcionou corretamente — os dados estão na base de dados (8 linhas importadas). O problema é que **todos os 8 CPEs têm `matched: false`** (razão: "CPE não encontrado" nas proposal_cpes). 

A lógica atual do `useCommissionAnalysis` **só mostra dados agrupados por comercial** — e como nenhum item foi associado a um comercial (`matched_user_id = null`), a tabela aparece vazia.

Além disso, os chargebacks não estão filtrados por mês — a query carrega **todos** os chargebacks da organização, sem filtrar pelo `selectedMonth`.

### Plano de alterações

**1. Mostrar itens não associados na UI (`CommissionAnalysisTab.tsx`)**
- Adicionar uma secção abaixo da tabela de comerciais que liste os chargebacks **não associados** (unmatched)
- Mostrar: CPE, valor chargeback, motivo da não associação
- Incluir um card de resumo com "Não associados" (quantidade e valor total)

**2. Adicionar dados de importação ao resumo (`CommissionAnalysisTab.tsx`)**
- Adicionar um 4º card métrico: "Não associados" com ícone de alerta, mostrando `summary.unmatchedCount` e `summary.unmatchedAmount`

**3. Expor itens não associados no hook (`useCommissionAnalysis.ts`)**
- Adicionar `unmatchedItems` ao `CommissionAnalysisData` para que a UI possa listá-los
- Interface: `{ cpe: string; chargebackAmount: number; unmatchedReason: string | null }`

**4. Corrigir o warning de ref (`ImportChargebacksDialog.tsx`)**
- O `forwardRef` ainda está a gerar warning — remover o `forwardRef` wrapper do componente `Select`

### Ficheiros a alterar
- `src/hooks/useCommissionAnalysis.ts` — expor `unmatchedItems` no return
- `src/components/finance/CommissionAnalysisTab.tsx` — mostrar card "Não associados" + tabela de itens unmatched

