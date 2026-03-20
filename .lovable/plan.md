

## Botão "Sincronizar com Ficheiro" — atualizar vendas com dados do ficheiro importado

### O que faz
Um botão que, para todas as linhas com discrepâncias no ficheiro importado, atualiza os CPEs do sistema (`proposal_cpes`) com os valores do ficheiro (DBL, Consumo anual, Duração). Após a atualização, as comissões são automaticamente recalculadas.

### Implementação

#### 1) Buscar `matched_proposal_cpe_id` nos items (`src/hooks/useCommissionAnalysis.ts`)

- Adicionar `matched_proposal_cpe_id` ao select dos `commission_chargeback_items` (linha 245)
- Adicionar ao `ChargebackItemRecord` interface
- Passar o `matched_proposal_cpe_id` para o `ComparisonRow` para que a UI saiba qual CPE atualizar

#### 2) Enriquecer `ComparisonRow` com ID do CPE

- Adicionar `matchedProposalCpeId: string | null` ao `ComparisonRow`
- Preencher no `buildComparison` usando o item correspondente

#### 3) Criar mutation de sincronização (`src/hooks/useCommissionAnalysis.ts`)

- Nova mutation `useSyncFileToSystem` que recebe um array de `{ proposalCpeId, dbl, consumoAnual, duracaoContrato }` e faz update em batch no `proposal_cpes`
- Após sucesso, invalida `commissions-live` e `commission-chargeback-data`

#### 4) Botão na UI (`src/components/finance/CommissionAnalysisTab.tsx`)

- Botão "Sincronizar dados do ficheiro" ao lado do indicador de import ativo
- Só aparece se existirem discrepâncias
- Dialog de confirmação: "Isto vai atualizar X CPEs no sistema com os valores do ficheiro. Continuar?"
- Após confirmação, executa a mutation e mostra toast de sucesso/erro

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — buscar `matched_proposal_cpe_id`, nova mutation, enriquecer `ComparisonRow`
- `src/components/finance/CommissionAnalysisTab.tsx` — botão + dialog de confirmação

