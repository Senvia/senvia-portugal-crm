

# Corrigir filtro "Atrasados" na pagina de Pagamentos

## Problema

O card "Atrasados" navega para `/financeiro/pagamentos?status=overdue`, mas a pagina de Pagamentos so reconhece `pending` e `paid` como filtros validos (linha 86). O valor `overdue` e ignorado e mostra todos os pagamentos.

## Solucao

Actualizar a pagina de Pagamentos para reconhecer `overdue` como filtro especial: mostra apenas pagamentos com status `pending` cuja data ja passou.

## Alteracoes tecnicas

### `src/pages/finance/Payments.tsx`

1. **useEffect (linha 84-89)**: Adicionar `'overdue'` a lista de valores aceites do URL:
```typescript
if (statusFromUrl === 'pending' || statusFromUrl === 'paid' || statusFromUrl === 'overdue') {
  setStatusFilter(statusFromUrl);
}
```

2. **filteredPayments (linha 100)**: Adicionar logica para o filtro `overdue` -- mostrar apenas pagamentos `pending` com `payment_date < hoje`:
```typescript
if (statusFilter === 'overdue') {
  if (payment.status !== 'pending') return false;
  const paymentDate = parseISO(payment.payment_date);
  if (paymentDate >= startOfDay(new Date())) return false;
} else if (statusFilter !== "all" && payment.status !== statusFilter) {
  return false;
}
```

3. **Select de estado (linha 304-313)**: Adicionar opcao "Atrasados" ao dropdown:
```html
<SelectItem value="overdue">Atrasados</SelectItem>
```

### Ficheiro alterado
- `src/pages/finance/Payments.tsx`

