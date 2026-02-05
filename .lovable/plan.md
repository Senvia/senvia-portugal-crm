

## Renomear "Entregue" para "Concluída" e Filtrar Financeiro

### Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/types/sales.ts` | Renomear label "Entregue" para "Concluída" |
| `src/hooks/useFinanceStats.ts` | Filtrar pagamentos apenas de vendas concluídas |
| `src/hooks/useAllPayments.ts` | Filtrar pagamentos apenas de vendas concluídas |
| `src/components/sales/EditSaleModal.tsx` | Só criar pagamentos automáticos se venda estiver concluída |
| `src/components/sales/CreateSaleModal.tsx` | Só criar pagamentos automáticos se status for "delivered" |

---

### Detalhes Tecnicos

#### 1. Renomear Label (types/sales.ts)

```typescript
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  delivered: 'Concluída',  // Antes: 'Entregue'
  cancelled: 'Cancelado',
};
```

#### 2. Filtrar Pagamentos no Financeiro

Nos hooks `useFinanceStats.ts` e `useAllPayments.ts`, adicionar filtro para só buscar pagamentos de vendas com `status = 'delivered'`:

```typescript
// useAllPayments.ts - adicionar JOIN com filtro
const { data, error } = await supabase
  .from('sale_payments')
  .select(`
    *,
    sales:sale_id!inner (
      id,
      code,
      status,
      total_value,
      leads:lead_id (name),
      crm_clients:client_id (name)
    )
  `)
  .eq('organization_id', organizationId)
  .eq('sales.status', 'delivered')  // Só vendas concluídas
  .order('payment_date', { ascending: false });
```

#### 3. Pagamentos Automaticos Apenas para Vendas Concluidas

No `EditSaleModal.tsx` e `CreateSaleModal.tsx`, verificar o status da venda antes de criar pagamentos:

```typescript
// Só criar pagamentos se a venda estiver concluída
if (organization && sale.status === 'delivered') {
  // ... lógica de criar pagamentos
}
```

---

### Comportamento Final

| Cenario | Resultado |
|---------|-----------|
| Venda pendente/em progresso | Nao aparece no financeiro |
| Venda concluida | Aparece no financeiro |
| Alterar venda para "Concluida" | Pagamentos sao criados automaticamente |
| Dashboard vendas | Mostra "Concluida" em vez de "Entregue" |

---

### Ficheiros a Modificar

| Ficheiro | Tipo de Alteracao |
|----------|-------------------|
| `src/types/sales.ts` | Renomear label |
| `src/hooks/useFinanceStats.ts` | Adicionar filtro por status da venda |
| `src/hooks/useAllPayments.ts` | Adicionar filtro por status da venda |
| `src/components/sales/EditSaleModal.tsx` | Condicionar criacao de pagamentos |
| `src/components/sales/CreateSaleModal.tsx` | Condicionar criacao de pagamentos |

**Total: 5 ficheiros modificados**

