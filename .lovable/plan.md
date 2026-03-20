

## Adicionar seleção de mês de referência na importação de ficheiros

### Problema
As datas no ficheiro nem sempre são fiáveis. Quando o utilizador importa, precisa de escolher a que mês o ficheiro se refere. Os dados desse ficheiro devem aparecer no mês selecionado, ignorando as datas internas do ficheiro.

### Implementação

#### 1) Migração — adicionar coluna `reference_month` à tabela `commission_chargeback_imports`
- Tipo `date`, nullable (para retrocompatibilidade)
- Também atualizar a RPC `import_commission_chargebacks` para aceitar o parâmetro `p_reference_month` e guardá-lo

#### 2) Dialog de importação (`ImportChargebacksDialog.tsx`)
- Adicionar um seletor de mês (input `type="month"` ou select com meses) na secção antes do botão "Importar"
- Estado `referenceMonth` (formato `YYYY-MM-01`)
- Passar o valor para a mutation

#### 3) Mutation (`useCommissionAnalysis.ts` — `useImportCommissionChargebacks`)
- Aceitar `referenceMonth` nos params
- Passar como `p_reference_month` na chamada RPC

#### 4) Filtro por mês na análise (`useCommissionAnalysis.ts`)
- Buscar `reference_month` no select dos imports (linha 251)
- Substituir o filtro de items por data do ficheiro (linhas 294-301): em vez de parsear `dataInicio` de cada row, comparar o `reference_month` do import ativo com o `selectedMonth`
- Se `reference_month` do import ativo não bater com o mês selecionado → `itemsFromActiveImport = []`
- Se bater → incluir todas as linhas do import

### Ficheiros alterados
- **Migração SQL** — coluna `reference_month` + atualizar RPC
- `src/components/finance/ImportChargebacksDialog.tsx` — seletor de mês + passar à mutation
- `src/hooks/useCommissionAnalysis.ts` — aceitar `referenceMonth` na mutation, filtrar pelo `reference_month` do import em vez de datas do ficheiro

