

## Criar Pagamentos Automáticos a Partir de Produtos Mensais

### Problema Identificado

Quando adicionas um produto mensal com data de vencimento (`first_due_date`) a uma venda, essa data é guardada apenas na tabela `sale_items`. O módulo financeiro, no entanto, só mostra dados da tabela `sale_payments` - **não há nenhuma ligação entre os dois**.

```text
FLUXO ATUAL (partido):
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  EditSaleModal  │ --> │   sale_items    │     │  sale_payments  │
│  first_due_date │     │  first_due_date │     │   (vazio)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        ↓
                                               ┌─────────────────┐
                                               │   Financeiro    │
                                               │   "Sem dados"   │
                                               └─────────────────┘
```

---

### Solucao

Ao guardar uma venda com produtos mensais, criar automaticamente um registo em `sale_payments` para cada item recorrente que tenha `first_due_date` definido.

```text
FLUXO CORRIGIDO:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  EditSaleModal  │ --> │   sale_items    │ --> │  sale_payments  │
│  first_due_date │     │  first_due_date │     │  payment_date   │
└─────────────────┘     └─────────────────┘     │  status=pending │
                                                └─────────────────┘
                                                        ↓
                                               ┌─────────────────┐
                                               │   Financeiro    │
                                               │   Mostra data   │
                                               └─────────────────┘
```

---

### Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/CreateSaleModal.tsx` | Apos criar items, criar pagamentos para items recorrentes |
| `src/components/sales/EditSaleModal.tsx` | Ao modificar items, sincronizar pagamentos recorrentes |

---

### Implementacao Tecnica

#### 1. CreateSaleModal - Criar pagamentos automaticos

Apos criar os `sale_items` (linha ~516), adicionar logica para criar pagamentos:

```typescript
// Após criar sale items, criar pagamentos para items recorrentes
if (items.length > 0 && sale?.id) {
  await createSaleItems.mutateAsync(...);
  
  // NOVO: Criar pagamentos automáticos para items mensais
  const recurringItemsWithDate = items.filter(item => {
    if (!item.product_id) return false;
    const product = products?.find(p => p.id === item.product_id);
    return product?.is_recurring && item.first_due_date;
  });
  
  for (const item of recurringItemsWithDate) {
    await createPayment.mutateAsync({
      sale_id: sale.id,
      organization_id: organization.id,
      amount: item.quantity * item.unit_price,
      payment_date: format(item.first_due_date!, 'yyyy-MM-dd'),
      status: 'pending',
      notes: `Mensalidade: ${item.name}`,
    });
  }
}
```

#### 2. EditSaleModal - Sincronizar pagamentos ao modificar items

Ao guardar alteracoes de items recorrentes com nova data, verificar se precisa criar/atualizar pagamentos:

```typescript
// Para items novos com first_due_date, criar pagamento
if (item.isNew && item.first_due_date && isRecurring) {
  await createPayment.mutateAsync({
    sale_id: sale.id,
    organization_id: organizationId,
    amount: item.quantity * item.unit_price,
    payment_date: format(item.first_due_date, 'yyyy-MM-dd'),
    status: 'pending',
    notes: `Mensalidade: ${item.name}`,
  });
}
```

---

### Comportamento Final

| Acao | Resultado |
|------|-----------|
| Criar venda com produto mensal + data | Cria item + cria pagamento pendente com essa data |
| Editar venda e adicionar produto mensal + data | Cria novo item + cria pagamento pendente |
| Financeiro → Proximos Recebimentos | Mostra o pagamento agendado |
| Financeiro → Grafico | Inclui no "Agendado" |

---

### Resumo de Alteracoes

| Tipo | Ficheiro | Descricao |
|------|----------|-----------|
| Frontend | `CreateSaleModal.tsx` | Criar pagamentos apos criar items recorrentes |
| Frontend | `EditSaleModal.tsx` | Criar pagamentos para novos items recorrentes |

**Total: 2 ficheiros modificados**

