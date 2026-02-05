

## Adicionar Data de Vencimento por Produto Mensal

### Problema

Quando se adiciona um produto/servico mensal (is_recurring = true) a uma venda, nao existe forma de definir quando vence a primeira parcela desse item especifico. Atualmente so existe uma data de vencimento global para toda a venda.

---

### Solucao

Adicionar um campo de data de vencimento na propria linha de cada produto mensal, permitindo definir individualmente quando cada servico recorrente comeca a ser cobrado.

---

### Nova Interface (Linha do Produto)

```text
PRODUTO SEM RECORRENCIA:
┌──────────────────────────────────────────────────────────────┐
│  [Instalacao         ] [-] 1 [+] [500,00€] = 500,00€   [X]  │
└──────────────────────────────────────────────────────────────┘

PRODUTO COM RECORRENCIA (is_recurring = true):
┌──────────────────────────────────────────────────────────────┐
│  [Manutencao Mensal  ] [-] 1 [+] [99,00€] = 99,00€    [X]   │
│  📅 Vence em: [05/03/2026 ▼]                                 │
└──────────────────────────────────────────────────────────────┘
```

---

### Alteracoes na Base de Dados

| Tabela | Coluna | Tipo | Descricao |
|--------|--------|------|-----------|
| `sale_items` | `first_due_date` | `date` | Data de vencimento da primeira parcela (nullable) |

---

### Alteracoes no Codigo

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Adicionar campo de data por item recorrente |
| `src/components/sales/CreateSaleModal.tsx` | Adicionar campo de data por item recorrente |
| `src/hooks/useSaleItems.ts` | Suportar `first_due_date` no create/update |

---

### Implementacao Tecnica

#### 1. Migracao SQL

```sql
ALTER TABLE sale_items 
ADD COLUMN first_due_date date;
```

#### 2. Interface SaleItemDraft Atualizada

```typescript
interface SaleItemDraft {
  id: string;
  originalId?: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  first_due_date?: Date | null;  // NOVO
  isNew?: boolean;
  isModified?: boolean;
}
```

#### 3. Linha de Item com Data (EditSaleModal)

```tsx
{items.map((item) => {
  const product = products?.find(p => p.id === item.product_id);
  const isRecurring = product?.is_recurring;
  
  return (
    <div key={item.id} className="p-3 rounded-lg border bg-card space-y-2">
      {/* Linha principal existente */}
      <div className="flex items-center gap-2">
        <Input value={item.name} ... />
        <Buttons -/+ />
        <Input value={item.unit_price} ... />
        <Total />
        <Button X />
      </div>
      
      {/* NOVO: Data de vencimento para produtos recorrentes */}
      {isRecurring && (
        <div className="flex items-center gap-2 pl-2 text-sm">
          <CalendarIcon className="h-4 w-4 text-blue-500" />
          <span className="text-muted-foreground">Vence em:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {item.first_due_date 
                  ? format(item.first_due_date, "dd/MM/yyyy")
                  : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={item.first_due_date}
                onSelect={(date) => handleUpdateDueDate(item.id, date)}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
})}
```

#### 4. Funcao handleUpdateDueDate

```typescript
const handleUpdateDueDate = (itemId: string, date: Date | undefined) => {
  setItems(current => 
    current.map(item => 
      item.id === itemId 
        ? { ...item, first_due_date: date || null, isModified: true }
        : item
    )
  );
};
```

#### 5. Guardar first_due_date

Ao submeter, incluir o campo na criacao/atualizacao:

```typescript
// Ao criar novo item
await createSaleItems.mutateAsync({
  organizationId,
  saleId: sale.id,
  items: newItems.map(item => ({
    name: item.name,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    first_due_date: item.first_due_date 
      ? format(item.first_due_date, 'yyyy-MM-dd') 
      : null,
  })),
});

// Ao atualizar item existente
await updateSaleItem.mutateAsync({
  itemId: item.originalId,
  updates: {
    ...
    first_due_date: item.first_due_date 
      ? format(item.first_due_date, 'yyyy-MM-dd') 
      : null,
  },
});
```

---

### Comportamento

| Acao | Resultado |
|------|-----------|
| Adicionar produto normal | Linha simples sem data |
| Adicionar produto mensal | Linha expandida com datepicker |
| Selecionar data | Guarda first_due_date no item |
| Guardar venda | Persiste data por item na BD |

---

### Resumo de Alteracoes

| Tipo | Ficheiro/Recurso | Descricao |
|------|------------------|-----------|
| Database | `sale_items` | Adicionar coluna `first_due_date` |
| Frontend | `EditSaleModal.tsx` | Campo de data inline por item recorrente |
| Frontend | `CreateSaleModal.tsx` | Campo de data inline por item recorrente |
| Hook | `useSaleItems.ts` | Suportar first_due_date no CRUD |

**Total: 1 migracao + 3 ficheiros modificados**

