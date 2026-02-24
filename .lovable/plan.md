

# Corrigir Valor Zerado ao Editar Venda

## Problema

Quando abres uma venda para editar, o valor total fica **zerado** (0,00 EUR). Isto acontece porque:

1. O `total_value` e calculado a partir dos **itens/produtos** da venda (soma das quantidades x precos)
2. Muitas vendas (especialmente as criadas a partir de propostas de energia) **nao tem itens** - o valor foi definido diretamente
3. Sem itens, a soma da 0, e ao guardar, o sistema grava 0 como valor total

## Solucao

Usar o valor original da venda como fallback quando nao existem itens. Se existirem itens, calcular normalmente. Se nao existirem, manter o valor original.

## Seccao Tecnica

### Ficheiro: `src/components/sales/EditSaleModal.tsx`

**1. Adicionar estado para o valor total manual (para vendas sem itens):**

Novo estado:
```typescript
const [manualTotalValue, setManualTotalValue] = useState<string>("");
```

Inicializar no useEffect existente (linha 139-155):
```typescript
setManualTotalValue(sale.total_value?.toString() || "0");
```

**2. Alterar o calculo do total (linhas 231-236):**

De:
```typescript
const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
const total = Math.max(0, subtotal - discountValue);
```

Para:
```typescript
const itemsSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
const hasItems = items.length > 0;
const subtotal = hasItems ? itemsSubtotal : parseFloat(manualTotalValue) || 0;
const total = hasItems ? Math.max(0, subtotal - discountValue) : subtotal;
```

**3. Mostrar input de valor total quando nao ha itens:**

Se `items.length === 0`, mostrar um campo editavel "Valor Total" no formulario para o utilizador poder ajustar o valor manualmente. Caso contrario, manter o calculo automatico a partir dos itens.

**4. No handleSubmit (linha 324):**

A logica ja usa `total_value: total`, que agora vai refletir o valor correto (manual ou calculado).

**Resultado:** O valor da venda nunca mais fica zerado. Vendas com itens calculam automaticamente; vendas sem itens preservam e permitem editar o valor original.

Total: 1 ficheiro editado (`EditSaleModal.tsx`).

