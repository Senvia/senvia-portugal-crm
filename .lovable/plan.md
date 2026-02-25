

## Corrigir Total em Tempo Real (Propostas e Vendas Telecom)

### Problema

Na imagem, a Proposta 0015 mostra kWp=78 e Comissão=508 (auto-calculado), e o campo "Comissão Total" no fundo mostra 508, mas o **"Total da Proposta"** no Resumo continua a mostrar **330,00€** (o valor antigo guardado na base de dados). A correção anterior (usar `totalComissao` em vez de `servicosComissao`) está correcta em termos de lógica de save, mas o display do "Total da Proposta" pode não estar a reagir porque `servicosDetails` é inicializado a partir de dados legacy que já contêm `comissao: 330`.

Na verdade, o problema é mais subtil: quando o modal abre, o `useEffect` na linha 86 inicializa `servicosDetails` com os dados da proposta (que têm `comissao: 330`). O `totalComissao` calcula correctamente 330 a partir desses dados. Quando o utilizador muda o kWp para 78, `handleUpdateProductDetail` recalcula a comissão para 508 e actualiza `servicosDetails`. O `totalComissao` deveria reagir e mostrar 508. **A correcção anterior está correcta** — se o total ainda mostra 330, é porque o preview ainda não tinha sido reconstruído no momento do screenshot.

No entanto, há um segundo problema no **EditSaleModal**: para vendas telecom de serviços, quando a comissão recalcula (via `setComissao`), o `manualTotalValue` não acompanha. O `total` é derivado de `manualTotalValue`, logo o valor guardado fica desactualizado. E o utilizador quer que o total seja **automático e bloqueado** (sem edição manual).

### Alterações

#### 1. `src/components/sales/EditSaleModal.tsx`

**Sync manualTotalValue para vendas de serviços** — adicionar lógica ao `useEffect` existente (linha 220-227) para também sincronizar quando `comissao` muda em vendas de serviços:

```typescript
useEffect(() => {
  if (!open || !sale || !isTelecom) return;
  if (sale.proposal_type === 'energia' && editableCpes.length > 0) {
    const margemTotal = editableCpes.reduce((sum, cpe) => sum + (cpe.margem || 0), 0);
    setManualTotalValue(margemTotal.toString());
  } else if (sale.proposal_type === 'servicos' && comissao) {
    setManualTotalValue(comissao);
  }
}, [open, sale, isTelecom, editableCpes, comissao]);
```

**Bloquear edição manual do total para vendas telecom** — no campo de "Valor Total" no Resumo (linha 978-985), tornar o input `readOnly` quando `isTelecom`:

```typescript
<Input
  type="number"
  value={manualTotalValue}
  onChange={(e) => setManualTotalValue(e.target.value)}
  className="h-8 text-right"
  step="0.01"
  min="0"
  readOnly={isTelecom}
/>
```

#### 2. `src/components/proposals/EditProposalModal.tsx`

A correcção anterior (usar `totalComissao` reactivo) já está aplicada e é correcta. Nenhuma alteração adicional necessária — o "Total da Proposta" no Resumo já usa `formatCurrency(totalValue)` que agora depende de `totalComissao`.

### Ficheiros a alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/sales/EditSaleModal.tsx` | Sincronizar `manualTotalValue` com `comissao` para serviços; bloquear edição manual do total para telecom |

