

## Remover campo "Valor da Proposta (EUR)" dos modais

### Problema

Os modais "Nova Proposta" e "Editar Proposta" tem um campo manual "Valor da Proposta (EUR)" que nao deveria existir -- o valor total deve ser calculado automaticamente a partir dos produtos adicionados.

### Impacto

O `manualValue` e somado ao total dos produtos no calculo do `totalValue`. Ao remove-lo, o total passa a ser apenas a soma dos produtos selecionados (para nichos nao-telecom). Isto e o comportamento correto.

### Alteracoes

**Ficheiro: `src/components/proposals/CreateProposalModal.tsx`**

1. Remover o bloco HTML do campo "Valor da Proposta" (linhas 448-462)
2. No calculo do `totalValue` (linha 112), remover `+ (parseFloat(manualValue) || 0)` -- total passa a ser so `productsTotal`
3. No resumo do valor (linha 590), remover a condicao `parseFloat(manualValue) > 0` -- mostrar resumo apenas quando `selectedProducts.length > 0`
4. Remover o state `manualValue` e `setManualValue` (linha 69) e as suas referencias no reset (linha 243)

**Ficheiro: `src/components/proposals/EditProposalModal.tsx`**

1. Remover o bloco HTML do campo "Valor da Proposta" (linhas 567-582)
2. No calculo do `totalValue` (linha 171), remover `+ (parseFloat(manualValue) || 0)`
3. No resumo do valor (linha 709), remover a condicao `parseFloat(manualValue) > 0`
4. Remover o state `manualValue` e `setManualValue` (linha 75) e as suas referencias no useEffect (linhas 114-117)

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/CreateProposalModal.tsx` | Remover campo manual de valor, state e logica associada |
| `src/components/proposals/EditProposalModal.tsx` | Remover campo manual de valor, state e logica associada |

