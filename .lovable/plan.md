

# Corrigir Erro "Rendered more hooks than during the previous render"

## Problema

O componente `SaleDetailsModal` tem um `return null` na linha 151 (`if (!sale) return null;`) **antes** de chamar o hook `useSaleActivationHistory` na linha 176. Isto viola as regras do React - hooks nao podem ser chamados depois de um return condicional.

## Solucao

Mover a chamada do `useSaleActivationHistory` para **antes** do `if (!sale) return null;`, junto com os outros hooks (entre as linhas 120-142).

## Seccao Tecnica

### Ficheiro: `src/components/sales/SaleDetailsModal.tsx`

**Alteracao 1**: Mover a linha 176:
```typescript
const { history: activationHistory, addEntry: addActivationEntry } = useSaleActivationHistory(sale?.id);
```

Para logo depois da linha 142 (antes do `useEffect` e do early return), por exemplo entre a linha 141 e 142, junto dos outros hooks.

**Alteracao 2**: Remover a linha 176 original.

Isto garante que todos os hooks sao chamados na mesma ordem em todas as renderizacoes, independentemente de `sale` ser null ou nao. O hook ja lida internamente com `sale?.id` ser undefined (tem `enabled: !!saleId`).
