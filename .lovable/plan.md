

## Sistema de Produtos Recorrentes e Renovacao de Vendas

### Conceito

Criar um sistema que permite marcar produtos/servicos como "recorrentes" (mensais), e quando uma venda contem esses produtos, gera alertas de renovacao. O utilizador pode entao decidir renovar (criar novo pagamento) ou cancelar (encerrar a venda).

---

### Fluxo de Utilizacao

```text
1. PRODUTO RECORRENTE (Configuracoes)
   ┌────────────────────────────────────────────────────┐
   │  Produto: Manutencao Mensal                        │
   │  Preco: €99/mes                                    │
   │  [🔄 Recorrente: ON]  ← Toggle para ativar        │
   └────────────────────────────────────────────────────┘

2. VENDA COM PRODUTO RECORRENTE
   ┌────────────────────────────────────────────────────┐
   │  Venda #0045 - Cliente XYZ                         │
   │  Items:                                            │
   │   - Instalacao Sistema (único)        €500        │
   │   - Manutencao Mensal (recorrente)    €99/mes 🔄  │
   │                                                    │
   │  Proxima Renovacao: 05/03/2026                     │
   │  [🔄 Renovar] [❌ Cancelar Recorrencia]            │
   └────────────────────────────────────────────────────┘

3. DASHBOARD/ALERTAS
   ┌────────────────────────────────────────────────────┐
   │  ⚠️ Vendas a Renovar (5)                           │
   │   - Cliente ABC - €99 - Vence em 3 dias           │
   │   - Cliente XYZ - €149 - Vence hoje               │
   └────────────────────────────────────────────────────┘
```

---

### Alteracoes na Base de Dados

#### 1. Tabela `products` - Novo campo

| Campo | Tipo | Descricao |
|-------|------|-----------|
| is_recurring | BOOLEAN | Se o produto e recorrente (mensal) |

#### 2. Tabela `sales` - Novos campos

| Campo | Tipo | Descricao |
|-------|------|-----------|
| has_recurring | BOOLEAN | Se a venda tem itens recorrentes |
| recurring_value | DECIMAL | Valor mensal recorrente |
| recurring_status | TEXT | 'active', 'cancelled', 'paused' |
| next_renewal_date | DATE | Proxima data de renovacao |
| last_renewal_date | DATE | Ultima renovacao feita |

---

### Migracao SQL

```sql
-- Adicionar campo de recorrencia aos produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Adicionar campos de recorrencia as vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS has_recurring BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS recurring_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS recurring_status TEXT DEFAULT 'active';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS next_renewal_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS last_renewal_date DATE;

-- Indice para buscar vendas com renovacao pendente
CREATE INDEX IF NOT EXISTS idx_sales_next_renewal ON sales(next_renewal_date) WHERE has_recurring = true AND recurring_status = 'active';
```

---

### Interface do Produto (Configuracoes)

```text
┌──────────────────────────────────────────────────────────────────┐
│  ✖  Editar Produto                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nome *                                                          │
│  [Manutencao Mensal____________________________]                 │
│                                                                  │
│  Descricao                                                       │
│  [Servico de manutencao preventiva mensal______]                 │
│                                                                  │
│  Preco Base (€)                                                  │
│  [99,00                                        ]                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🔄 Produto Recorrente                              [ON]   │  │
│  │  Este produto e cobrado mensalmente. Vendas com este       │  │
│  │  produto terao opcao de renovacao automatica.              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Produto ativo                                          [ON]     │
│                                                                  │
│                              [Cancelar]  [Guardar]               │
└──────────────────────────────────────────────────────────────────┘
```

---

### Interface da Venda com Recorrencia

#### Card da Venda (Lista)

```text
┌────────────────────────────────────────────────────────────────────┐
│  [🔵 Em Progresso] #0045  04 Fev 2026                             │
│  Cliente XYZ                                          €599,00     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🔄 Recorrente: €99/mes  Proxima: 05/03/2026                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

#### Modal de Detalhes da Venda

Nova seccao "Recorrencia":

```text
┌──────────────────────────────────────────────────────────────────┐
│  🔄 Recorrencia                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Valor Mensal             Proxima Renovacao                      │
│  €99,00                   05/03/2026                             │
│                                                                  │
│  Estado: [🟢 Ativo ▼]                                            │
│                                                                  │
│  Historico:                                                      │
│  • 05/02/2026 - Renovado - €99                                   │
│  • 05/01/2026 - Renovado - €99                                   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ 🔄 Renovar Agora     │  │ ❌ Cancelar Recorrencia          │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Logica de Renovacao

Quando o utilizador clica "Renovar":

1. Criar novo registo em `sale_payments` com:
   - `amount`: recurring_value
   - `payment_date`: data atual
   - `status`: 'pending' (agendado) ou 'paid'

2. Atualizar a venda:
   - `last_renewal_date`: data atual
   - `next_renewal_date`: data atual + 1 mes

Quando o utilizador clica "Cancelar Recorrencia":

1. Atualizar a venda:
   - `recurring_status`: 'cancelled'
   - Opcionalmente, alterar `status` da venda para 'cancelled'

---

### Alertas de Renovacao

No dashboard financeiro (ou vendas), adicionar seccao de alertas:

```text
┌────────────────────────────────────────────────────────────────────┐
│  ⚠️ Renovacoes Pendentes (3)                                      │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🔴 Cliente ABC                                               │ │
│  │ Venda #0032 - €149/mes - Vencida ha 2 dias                  │ │
│  │                          [Renovar] [Cancelar]                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🟠 Cliente XYZ                                               │ │
│  │ Venda #0045 - €99/mes - Vence em 3 dias                     │ │
│  │                          [Renovar] [Cancelar]                │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

### Ficheiros a Criar

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/hooks/useRecurringSales.ts` | Hook | Buscar vendas com renovacao pendente |
| `src/components/sales/RecurringSection.tsx` | Componente | Seccao de recorrencia no modal de venda |
| `src/components/sales/RenewalAlertsWidget.tsx` | Componente | Widget de alertas de renovacao |

---

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/types/proposals.ts` | Adicionar `is_recurring` ao tipo Product |
| `src/types/sales.ts` | Adicionar campos de recorrencia ao tipo Sale |
| `src/hooks/useProducts.ts` | Suportar campo is_recurring |
| `src/hooks/useSales.ts` | Suportar campos de recorrencia |
| `src/components/settings/CreateProductModal.tsx` | Toggle de recorrencia |
| `src/components/settings/EditProductModal.tsx` | Toggle de recorrencia |
| `src/components/settings/ProductsTab.tsx` | Badge de recorrente |
| `src/components/sales/CreateSaleModal.tsx` | Calcular recurring_value e next_renewal_date |
| `src/components/sales/SaleDetailsModal.tsx` | Nova seccao de recorrencia |
| `src/pages/Sales.tsx` | Badge de recorrencia nos cards |
| `src/pages/Finance.tsx` | Widget de alertas de renovacao |

---

### Detalhes de Implementacao

#### 1. Criar Venda com Recorrencia

Ao criar uma venda, verificar se algum item tem `is_recurring = true`:

```typescript
// CreateSaleModal.tsx
const recurringItems = items.filter(item => {
  const product = products?.find(p => p.id === item.product_id);
  return product?.is_recurring;
});

const recurringValue = recurringItems.reduce(
  (sum, item) => sum + (item.quantity * item.unit_price), 0
);

const hasRecurring = recurringValue > 0;

// Ao criar a venda
createSale.mutateAsync({
  // ... outros campos
  has_recurring: hasRecurring,
  recurring_value: recurringValue,
  recurring_status: hasRecurring ? 'active' : null,
  next_renewal_date: hasRecurring 
    ? addMonths(saleDate, 1).toISOString().split('T')[0] 
    : null,
});
```

#### 2. Hook useRecurringSales

```typescript
export function useRecurringSales() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["recurring-sales", organization?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const soon = addDays(new Date(), 7).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("sales")
        .select(`*, client:crm_clients(id, name)`)
        .eq("organization_id", organization!.id)
        .eq("has_recurring", true)
        .eq("recurring_status", "active")
        .lte("next_renewal_date", soon)
        .order("next_renewal_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}
```

#### 3. Renovar Venda

```typescript
export function useRenewSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      organizationId,
      amount,
      paymentMethod
    }) => {
      // Criar pagamento
      await supabase.from("sale_payments").insert({
        organization_id: organizationId,
        sale_id: saleId,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        payment_method: paymentMethod || null,
        notes: 'Renovacao mensal',
      });

      // Atualizar venda
      const nextMonth = addMonths(new Date(), 1).toISOString().split('T')[0];
      await supabase.from("sales").update({
        last_renewal_date: new Date().toISOString().split('T')[0],
        next_renewal_date: nextMonth,
      }).eq("id", saleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale-payments"] });
      toast.success("Renovacao registada!");
    },
  });
}
```

---

### Layout Mobile

```text
┌────────────────────────────────────────┐
│  🔄 RECORRENCIA                        │
├────────────────────────────────────────┤
│  €99,00/mes                            │
│  Proxima: 05/03/2026                   │
│  Estado: 🟢 Ativo                      │
│                                        │
│  ┌────────────────────────────────────┐│
│  │      🔄 Renovar Agora              ││
│  └────────────────────────────────────┘│
│  ┌────────────────────────────────────┐│
│  │      ❌ Cancelar                   ││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

---

### Fluxo de Implementacao

| Passo | Tipo | Descricao |
|-------|------|-----------|
| 1 | Migracao | Adicionar campos a products e sales |
| 2 | Tipos | Atualizar tipos TypeScript |
| 3 | Produtos | Adicionar toggle de recorrencia |
| 4 | Hook | Criar useRecurringSales e useRenewSale |
| 5 | Venda | Logica de calculo ao criar venda |
| 6 | Modal | Seccao de recorrencia nos detalhes |
| 7 | Lista | Badge de recorrente nos cards |
| 8 | Widget | Alertas de renovacao no dashboard |

**Total: 1 migracao + 3 novos ficheiros + 11 ficheiros modificados**

---

### Casos Especiais

| Cenario | Comportamento |
|---------|---------------|
| Produto deixa de ser recorrente | Vendas existentes mantem configuracao |
| Venda cancelada | Recorrencia tambem e cancelada |
| Multiplos produtos recorrentes | Soma de todos os valores recorrentes |
| Editar venda | Recalcula recurring_value e has_recurring |

