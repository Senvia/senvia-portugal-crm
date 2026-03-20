

## Remover o passo de mapeamento manual do import de chargebacks

### Problema
O passo "2. Mapeamento" pede ao utilizador para escolher manualmente as colunas CPE, valor e tipo — mas as colunas do ficheiro EDP já são conhecidas e auto-detectadas. É desnecessário.

### Solução
Remover toda a secção "2. Mapeamento" do dialog. As colunas são detectadas automaticamente via `detectCpeColumn`, `detectAmountColumn` e `detectTypeColumn` (que já existem e funcionam). O filtro de tipo ("CB") também já é aplicado por defeito.

O fluxo passa a ser:
1. Carregar ficheiro → auto-detecção das colunas
2. Resumo + botão "Importar"

### Alterações

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

- Remover toda a `<section>` do passo "2. Mapeamento" (linhas 235-324) — os 3 selects de coluna e o input de filtro
- Manter a auto-detecção nos `useEffect` e `useMemo` (já funciona em background)
- Mover o bloco "Resumo antes de importar" para dentro da secção do ficheiro (após upload)
- Se a auto-detecção falhar (coluna CPE ou valor não encontrada), mostrar um alerta inline em vez de selects manuais

