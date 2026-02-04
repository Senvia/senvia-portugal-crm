
## Funcionalidade: Editar Vendas Completo

### Situação Atual

O sistema atualmente só permite:
- Ver detalhes da venda (SaleDetailsModal)
- Alterar estado e notas
- Eliminar a venda

**Não existe forma de editar completamente uma venda** (adicionar produtos, alterar descontos, métodos de pagamento, etc.)

---

### Solução Proposta

Criar um **EditSaleModal** completo que permita editar todos os campos de uma venda que não esteja em estado "Entregue" ou "Cancelado".

---

### Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Novo | Modal completo para edição de vendas |
| `src/hooks/useSaleItems.ts` | Modificar | Adicionar hook para atualizar item existente |
| `src/hooks/useSales.ts` | Modificar | Expandir campos atualizáveis |
| `src/components/sales/SaleDetailsModal.tsx` | Modificar | Adicionar botão "Editar" |
| `src/pages/Sales.tsx` | Modificar | Integrar modal de edição |

---

### Interface do Utilizador

#### Botão de Editar no SaleDetailsModal

No modal de detalhes, se a venda **NÃO** estiver em "Entregue" ou "Cancelado":

```text
┌──────────────────────────────────────────────────────────────┐
│ [Código] Venda #0012    │ Badge: Pendente │   12 Jan 2024    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Estado da Venda: Pendente ▼]                               │
│                                                              │
│  ... (dados da venda) ...                                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [✏️ Editar Venda]                     [🗑️ Eliminar Venda]  │
└──────────────────────────────────────────────────────────────┘
```

#### Modal de Edição (EditSaleModal)

Estrutura semelhante ao CreateSaleModal mas com dados pré-preenchidos:

```text
┌──────────────────────────────────────────────────────────────┐
│                    Editar Venda #0012                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 Cliente: [João Silva ▼]          📅 Data: [12/01/2024]  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  📦 PRODUTOS/SERVIÇOS                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tratamento Facial    Qtd: [1]  Preço: €150   [×]       │ │
│  │ Botox                Qtd: [2]  Preço: €300   [×]       │ │
│  └────────────────────────────────────────────────────────┘ │
│  [+ Adicionar Produto ▼]                                     │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  💰 PAGAMENTO                                                │
│                                                              │
│  Método: [MB Way ▼]        Estado: [Pendente ▼]             │
│  Data Vencimento: [📅]     Referência Fatura: [____]        │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  📝 RESUMO                                                   │
│                                                              │
│  Subtotal:                                          €750,00  │
│  Desconto: [___€]                                   -€50,00  │
│  ──────────────────────────────────────────────────────────  │
│  TOTAL:                                             €700,00  │
│                                                              │
│  Notas: [________________________________]                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [Cancelar]                            [💾 Guardar Alterações]│
└──────────────────────────────────────────────────────────────┘
```

---

### Campos Editáveis

| Campo | Editável | Observação |
|-------|----------|------------|
| Cliente | ✓ | Dropdown de clientes |
| Data da Venda | ✓ | Date picker |
| Produtos/Serviços | ✓ | Adicionar, remover, alterar quantidade e preço |
| Desconto | ✓ | Valor em euros |
| Método de Pagamento | ✓ | MB Way, Transferência, etc. |
| Estado do Pagamento | ✓ | Pendente, Parcial, Pago |
| Data de Vencimento | ✓ | Data limite para pagamento |
| Data de Pagamento | ✓ | Quando foi pago (aparece se Pago) |
| Referência da Fatura | ✓ | Número da fatura |
| Notas | ✓ | Observações |
| Estado da Venda | ✗ | Editado no modal de detalhes |
| Proposta Associada | ✗ | Apenas leitura |

---

### Condições de Edição

| Estado | Pode Editar? | Justificação |
|--------|--------------|--------------|
| Pendente | ✅ Sim | Ainda não processada |
| Em Progresso | ✅ Sim | Pode precisar de ajustes |
| Entregue | ⚠️ Parcial | Só notas e referência fatura |
| Cancelado | ❌ Não | Venda fechada |

---

### Detalhes Técnicos

#### 1. Novo Hook: useUpdateSaleItem (em useSaleItems.ts)

```typescript
export function useUpdateSaleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      saleId,
      updates 
    }: { 
      itemId: string; 
      saleId: string;
      updates: { 
        quantity?: number; 
        unit_price?: number; 
        total?: number;
        name?: string;
      } 
    }) => {
      const { error } = await supabase
        .from("sale_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", data.saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
```

#### 2. Expandir useUpdateSale (em useSales.ts)

Adicionar campos:
```typescript
updates: { 
  // Campos existentes...
  client_id?: string | null;
  sale_date?: string;
  // Campos de energia/serviços se necessário
  proposal_type?: ProposalType | null;
  consumo_anual?: number | null;
  margem?: number | null;
  // etc.
}
```

#### 3. EditSaleModal.tsx (Novo Componente)

Interface:
```typescript
interface EditSaleModalProps {
  sale: SaleWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

Funcionalidades:
- Carregar dados atuais da venda
- Carregar sale_items existentes (useSaleItems)
- Permitir adicionar novos produtos (useProducts)
- Permitir remover/editar items existentes
- Calcular totais em tempo real
- Guardar alterações (useUpdateSale + operações em sale_items)

#### 4. SaleDetailsModal - Adicionar Botão Editar

```tsx
const canEdit = sale.status !== 'delivered' && sale.status !== 'cancelled';

// No footer:
<div className="flex gap-2">
  {canEdit && (
    <Button variant="outline" onClick={() => onEdit?.(sale)}>
      <Pencil className="h-4 w-4 mr-2" />
      Editar Venda
    </Button>
  )}
  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
    <Trash2 className="h-4 w-4 mr-2" />
    Eliminar Venda
  </Button>
</div>
```

#### 5. Sales.tsx - Integrar Modal de Edição

```tsx
const [saleToEdit, setSaleToEdit] = useState<SaleWithDetails | null>(null);

// No SaleDetailsModal:
<SaleDetailsModal
  sale={selectedSale}
  open={!!selectedSale}
  onOpenChange={(open) => !open && setSelectedSale(null)}
  onEdit={(sale) => {
    setSelectedSale(null);
    setSaleToEdit(sale);
  }}
/>

// Adicionar EditSaleModal:
<EditSaleModal
  sale={saleToEdit!}
  open={!!saleToEdit}
  onOpenChange={(open) => !open && setSaleToEdit(null)}
/>
```

---

### Fluxo de Utilização

```text
1. Utilizador abre venda na lista
2. Modal de detalhes abre
3. Se estado permite, vê botão "Editar Venda"
4. Clica em "Editar Venda"
5. Modal de detalhes fecha, modal de edição abre
6. Edita campos necessários (produtos, pagamento, etc.)
7. Clica "Guardar Alterações"
8. Sistema atualiza venda e items
9. Toast de sucesso + modal fecha
10. Lista de vendas atualizada
```

---

### Tratamento de Sale Items

| Ação | Implementação |
|------|---------------|
| Item existente alterado | `useUpdateSaleItem` |
| Item existente removido | `useDeleteSaleItem` |
| Novo item adicionado | `useCreateSaleItems` |

A lógica no submit:
```typescript
// 1. Identificar items a criar (novos)
const newItems = editedItems.filter(i => i.isNew);

// 2. Identificar items a atualizar (existentes modificados)
const updatedItems = editedItems.filter(i => !i.isNew && i.isModified);

// 3. Identificar items a eliminar (removidos)
const deletedIds = originalItemIds.filter(id => 
  !editedItems.find(i => i.id === id)
);

// Executar operações
await Promise.all([
  ...deletedIds.map(id => deleteSaleItem.mutateAsync({ itemId: id, saleId })),
  ...updatedItems.map(item => updateSaleItem.mutateAsync({ ... })),
]);
if (newItems.length > 0) {
  await createSaleItems.mutateAsync(newItems);
}
```

---

### Resumo de Implementação

| Componente | Ação |
|------------|------|
| `EditSaleModal.tsx` | Criar |
| `useSaleItems.ts` | Adicionar useUpdateSaleItem |
| `useSales.ts` | Expandir useUpdateSale |
| `SaleDetailsModal.tsx` | Adicionar botão + prop onEdit |
| `Sales.tsx` | Gerir estado saleToEdit + integrar modal |

**Total: 1 novo ficheiro + 4 modificações**
