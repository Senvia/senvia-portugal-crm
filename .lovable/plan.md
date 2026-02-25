

## Corrigir Total da Proposta/Venda que Não Guarda ao Editar

### Problema Identificado

O bug esta no calculo de `totalValue` dentro do **EditProposalModal**.

**EditProposalModal (linhas 166-175):**
```typescript
const totalValue = useMemo(() => {
  if (isTelecom) {
    if (proposalType === 'energia') {
      return proposalCpes.reduce(...); // OK - reactivo
    }
    return parseFloat(servicosComissao) || 0; // BUG - stale!
  }
  ...
}, [isTelecom, proposalType, proposalCpes, servicosComissao, selectedProducts]);
```

Para propostas de **servicos**, o `totalValue` usa `servicosComissao` — uma variavel de estado inicializada **uma unica vez** a partir de `proposal.comissao` (linha 97). Quando o utilizador altera detalhes dos produtos (kwp, modelo, etc.), o `servicosDetails` actualiza e o `totalComissao` recalcula correctamente, **mas** `servicosComissao` nunca muda. Resultado: o `total_value` guardado e sempre o valor antigo.

Em **CreateProposalModal** (linha 112), para servicos retorna `0` e guarda `comissao: totalComissao`. O Edit esta inconsistente.

Para **EditSaleModal**, a mesma logica aplica-se: `manualTotalValue` e inicializado uma vez e nao sincroniza com alteracoes de CPEs ou comissao.

### Solucao

#### 1. `src/components/proposals/EditProposalModal.tsx`

Alterar o `totalValue` para servicos: usar `totalComissao` em vez de `servicosComissao` (que e stale). Isto garante que quando a comissao recalcula (ao mudar modelo, kwp, etc.), o total guardado reflecte o novo valor.

```typescript
const totalValue = useMemo(() => {
  if (isTelecom) {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.margem) || 0), 0);
    }
    return totalComissao; // FIX: usar totalComissao reactivo
  }
  const productsTotal = selectedProducts.reduce((sum, p) => sum + getProductTotal(p), 0);
  return productsTotal;
}, [isTelecom, proposalType, proposalCpes, totalComissao, selectedProducts]);
```

**Nota:** `totalValue` depende de `totalComissao` que depende de `servicosDetails` — o useMemo de `totalComissao` e declarado ANTES de `totalValue`, portanto nao ha problema de ordering. Confirmar isto no codigo (linha 177 vs 166).

Problema de ordering: `totalComissao` e declarado na **linha 177**, mas `totalValue` na **linha 166**. `totalValue` referencia `totalComissao` que ainda nao foi declarado. Solucao: mover o `useMemo` de `totalComissao` para ANTES do `totalValue`, ou inverter a ordem dos dois.

#### 2. `src/components/sales/EditSaleModal.tsx`

Para vendas telecom, sincronizar `manualTotalValue` quando os CPEs editaveis mudam (energia) ou quando a comissao recalcula (servicos). Adicionar `useEffect`:

```typescript
// Sync manualTotalValue when editable CPEs change (energia sales)
useEffect(() => {
  if (!open || !sale || !isTelecom) return;
  if (sale.proposal_type === 'energia' && editableCpes.length > 0) {
    const margemTotal = editableCpes.reduce((sum, cpe) => sum + (cpe.margem || 0), 0);
    setManualTotalValue(margemTotal.toString());
  }
}, [open, sale, isTelecom, editableCpes]);
```

### Ficheiros a alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/proposals/EditProposalModal.tsx` | Reordenar `totalComissao` antes de `totalValue`; alterar `totalValue` para servicos usar `totalComissao` em vez de `servicosComissao` stale |
| `src/components/sales/EditSaleModal.tsx` | Adicionar `useEffect` para sincronizar `manualTotalValue` quando CPEs editaveis ou comissao mudam |

### Detalhe Tecnico

- A variavel `servicosComissao` pode ser mantida para inicializar o display, mas **nao deve ser usada** no calculo do total guardado
- O `totalComissao` ja existe e calcula correctamente a soma das comissoes de todos os produtos activos em `servicosDetails`
- Para vendas, o `comissao` state ja e sincronizado pelo `useEffect` existente (linha 221-242), mas o `total_value` (via `manualTotalValue`) nao acompanha

