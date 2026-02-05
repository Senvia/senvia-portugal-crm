

## Correcao do Modal de Edicao de Vendas

### Problemas Identificados

1. **Recorrencia nao ativa automaticamente**: Quando adicionas um produto mensal, o toggle de recorrencia nao se ativa e os campos nao aparecem
2. **Modal nao faz scroll**: O conteudo do modal fica cortado e nao se consegue ver tudo

---

### Solucao

#### Problema 1: Auto-Activar Recorrencia

Adicionar um `useEffect` que detecta quando existem produtos recorrentes e:
- Ativa o toggle `hasRecurring` automaticamente
- Calcula e preenche o `recurringValue` com a soma dos produtos recorrentes
- Define uma data sugerida para `nextRenewalDate` (+1 mes)

```text
FLUXO ACTUAL:
  Adiciona produto mensal → Nada acontece → Toggle OFF

FLUXO CORRIGIDO:
  Adiciona produto mensal → Detecta is_recurring → Toggle ON automaticamente
                         → Calcula valor mensal
                         → Sugere proxima data
```

#### Problema 2: Scroll do Modal

O `ScrollArea` do Radix precisa de altura fixa para funcionar. Modificar:
- `DialogContent`: remover `max-h-[90vh]` e usar `flex flex-col`
- `ScrollArea`: usar `flex-1 overflow-hidden` para ocupar espaco disponivel

---

### Alteracoes Tecnicas

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Adicionar auto-detecao de produtos recorrentes e corrigir scroll |

---

### Implementacao

#### 1. useEffect para Auto-Detectar Recorrencia (apos linha 130)

```typescript
// Auto-detectar produtos recorrentes e ativar toggle
useEffect(() => {
  if (!products || items.length === 0) return;
  
  // Encontrar items que sao produtos recorrentes
  const recurringItems = items.filter(item => {
    const product = products.find(p => p.id === item.product_id);
    return product?.is_recurring;
  });
  
  const calculatedRecurringValue = recurringItems.reduce(
    (sum, item) => sum + (item.quantity * item.unit_price), 0
  );
  
  // Se existem produtos recorrentes, ativar toggle e sugerir valores
  if (calculatedRecurringValue > 0) {
    if (!hasRecurring) {
      setHasRecurring(true);
    }
    // Atualizar valor recorrente calculado
    setRecurringValue(calculatedRecurringValue.toString());
    
    // Se nao tem data definida, sugerir +1 mes
    if (!nextRenewalDate) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setNextRenewalDate(nextMonth);
    }
  }
}, [items, products]);
```

#### 2. Corrigir ScrollArea no DialogContent

**Antes (linha 315):**
```tsx
<DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
```

**Depois:**
```tsx
<DialogContent className="max-w-lg h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
```

**Antes (linha 328):**
```tsx
<ScrollArea className="max-h-[calc(90vh-10rem)]">
```

**Depois:**
```tsx
<ScrollArea className="flex-1 min-h-0">
```

---

### Comportamento Final

| Acao | Resultado |
|------|-----------|
| Adicionar produto mensal | Toggle ativa, valor e data sao preenchidos automaticamente |
| Remover produto mensal | Toggle pode ser desativado manualmente |
| Scroll no modal | Conteudo desliza normalmente, botoes fixos no fundo |

**Total: 1 ficheiro modificado**

