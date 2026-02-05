

## Sincronizar Pagamentos de Produtos Mensais Existentes

### Problema

A logica atual so cria pagamentos automaticos para:
- Items novos no CreateSaleModal
- Items novos no EditSaleModal

**Nao cobre**: Items existentes que foram atualizados com uma nova `first_due_date`.

A tua venda 0003 tem o produto "Trafego Pago" com data 2026-02-09, mas nao foi criado um pagamento pendente para essa data.

---

### Solucao

Melhorar a logica do `EditSaleModal` para tambem criar pagamentos quando:
1. Um item existente e atualizado com uma `first_due_date` nova
2. Verificar se ja existe um pagamento para evitar duplicados

---

### Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Criar pagamentos para items existentes que recebem `first_due_date` |

---

### Implementacao

No `EditSaleModal`, apos atualizar items existentes, verificar se precisam de pagamento:

```typescript
// Para cada item existente com first_due_date atualizado
for (const item of items) {
  if (item.id && !item.id.startsWith('new-')) {
    // Item existente
    const product = products?.find(p => p.id === item.product_id);
    if (product?.is_recurring && item.first_due_date) {
      // Verificar se ja existe pagamento com essa data
      const { data: existingPayments } = await supabase
        .from('sale_payments')
        .select('id')
        .eq('sale_id', sale.id)
        .eq('payment_date', format(item.first_due_date, 'yyyy-MM-dd'))
        .eq('status', 'pending');
      
      // Se nao existe, criar
      if (!existingPayments || existingPayments.length === 0) {
        await createSalePayment.mutateAsync({
          sale_id: sale.id,
          organization_id: organization.id,
          amount: item.quantity * item.unit_price,
          payment_date: format(item.first_due_date, 'yyyy-MM-dd'),
          status: 'pending',
          notes: `Mensalidade: ${item.name}`,
        });
      }
    }
  }
}
```

---

### Comportamento Final

| Cenario | Resultado |
|---------|-----------|
| Criar venda com produto mensal + data | Cria pagamento pendente |
| Adicionar produto mensal a venda existente | Cria pagamento pendente |
| Alterar data de produto mensal existente | Cria pagamento pendente (se nao existir) |
| Guardar sem alterar data | Nao duplica pagamentos |

---

### Nota Adicional

Para a tua venda atual (0003), apos esta alteracao, basta abrir o modal de editar e guardar novamente - o sistema vai criar o pagamento pendente automaticamente.

**Total: 1 ficheiro modificado**

