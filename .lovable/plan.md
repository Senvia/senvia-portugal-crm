

## Funcionalidade: Desconto nos Produtos das Propostas

### Objetivo

Adicionar campo de desconto para cada produto adicionado nas propostas, permitindo:
- Desconto por **percentagem** (%)
- Ou desconto por **valor fixo** (€)

---

### Alterações nos Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/CreateProposalModal.tsx` | Adicionar campo de desconto e tipo de desconto por produto |
| `src/components/proposals/EditProposalModal.tsx` | Mesma funcionalidade para edição |

---

### Estrutura do Produto Selecionado (Atualizada)

```typescript
interface SelectedProduct {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount_type: 'percentage' | 'fixed';  // NOVO
  discount_value: number;                   // NOVO
}
```

---

### Interface do Utilizador

Para cada produto adicionado, mostrar:

```
┌─────────────────────────────────────────────────────────┐
│ [📦] Tratamento Facial                                  │
│                                                         │
│ Qtd: [1]  Preço: €150,00                               │
│                                                         │
│ Desconto: [% | €]  Valor: [___]                        │
│                                                         │
│ Subtotal: €135,00 (com 10% desconto)           [×]     │
└─────────────────────────────────────────────────────────┘
```

---

### Cálculo do Total

```typescript
const calculateProductTotal = (product: SelectedProduct) => {
  const subtotal = product.quantity * product.unit_price;
  
  if (product.discount_type === 'percentage') {
    return subtotal * (1 - product.discount_value / 100);
  }
  
  // Desconto fixo
  return subtotal - product.discount_value;
};

const totalValue = useMemo(() => {
  const productsTotal = selectedProducts.reduce(
    (sum, p) => sum + calculateProductTotal(p), 
    0
  );
  return productsTotal + (parseFloat(manualValue) || 0);
}, [selectedProducts, manualValue]);
```

---

### Alterações em CreateProposalModal.tsx

**1. Atualizar tipo do estado:**
```tsx
const [selectedProducts, setSelectedProducts] = useState<Array<{
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}>>([]);
```

**2. Atualizar handleAddProduct:**
```tsx
setSelectedProducts(prev => [...prev, {
  product_id: product.id,
  name: product.name,
  quantity: 1,
  unit_price: product.price || 0,
  discount_type: 'percentage',  // Default
  discount_value: 0,
}]);
```

**3. Adicionar função de atualização de desconto:**
```tsx
const handleUpdateProductDiscount = (
  productId: string, 
  discountType: 'percentage' | 'fixed', 
  discountValue: number
) => {
  setSelectedProducts(prev => 
    prev.map(p => p.product_id === productId 
      ? { ...p, discount_type: discountType, discount_value: discountValue } 
      : p
    )
  );
};
```

**4. UI por produto (secção de lista):**
```tsx
{selectedProducts.map((item) => {
  const subtotal = item.quantity * item.unit_price;
  const discountedTotal = item.discount_type === 'percentage'
    ? subtotal * (1 - item.discount_value / 100)
    : subtotal - item.discount_value;
    
  return (
    <div key={item.product_id} className="p-3 rounded-lg bg-muted space-y-2">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">{item.name}</span>
        <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(item.product_id)}>
          ×
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Quantidade</Label>
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleUpdateProductQuantity(item.product_id, parseInt(e.target.value) || 0)}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
          <Input
            type="number"
            step="0.01"
            value={item.unit_price}
            onChange={(e) => handleUpdateProductPrice(item.product_id, parseFloat(e.target.value) || 0)}
            className="h-8"
          />
        </div>
      </div>
      
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Desconto</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={item.discount_type === 'percentage' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-10 p-0"
              onClick={() => handleUpdateProductDiscount(item.product_id, 'percentage', item.discount_value)}
            >
              %
            </Button>
            <Button
              type="button"
              variant={item.discount_type === 'fixed' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-10 p-0"
              onClick={() => handleUpdateProductDiscount(item.product_id, 'fixed', item.discount_value)}
            >
              €
            </Button>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.discount_value}
              onChange={(e) => handleUpdateProductDiscount(
                item.product_id, 
                item.discount_type, 
                parseFloat(e.target.value) || 0
              )}
              className="h-8 flex-1"
              placeholder="0"
            />
          </div>
        </div>
        <div className="text-right">
          <Label className="text-xs text-muted-foreground">Subtotal</Label>
          <div className="text-sm font-medium">{formatCurrency(discountedTotal)}</div>
        </div>
      </div>
    </div>
  );
})}
```

---

### Resultado Visual

| Campo | Antes | Depois |
|-------|-------|--------|
| Quantidade | ✓ | ✓ |
| Preço Unitário | ✓ (fixo) | ✓ (editável) |
| Tipo Desconto | - | ✓ (% ou €) |
| Valor Desconto | - | ✓ |
| Subtotal com Desconto | - | ✓ |

---

### Notas Técnicas

- O desconto é aplicado **por linha de produto**
- O campo "Valor da Proposta" continua disponível para valores adicionais/manuais
- O total final = soma dos subtotais com desconto + valor manual
- Esta funcionalidade aplica-se apenas a **nichos não-telecom**

