

## Funcionalidade: Sistema de Pagamentos com Múltiplas Parcelas

### Problemas Identificados

1. **Campo de Fatura não visível** - O campo `invoiceReference` está no modal mas sem o label correto destacado
2. **Pagamento Parcial sem valor** - Quando estado é "Parcial", não há campo para indicar quanto foi recebido
3. **Falta flexibilidade** - Uma venda pode ter múltiplos pagamentos (ex: 50% adiantamento + 50% na entrega)

### Solução Proposta

Criar uma **tabela de pagamentos** (`sale_payments`) que permite registar múltiplos pagamentos por venda, cada um com:
- Valor recebido
- Data do pagamento
- Método de pagamento
- Referência de fatura própria

---

### Nova Estrutura de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│ VENDA #0012                                     Total: €1.000  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💳 PAGAMENTOS                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 15 Jan 2024 │ MB Way  │ €500    │ FT 2024/001  │ [✓ Pago] │  │
│  │ 20 Jan 2024 │ Transf. │ €500    │ FT 2024/002  │ [Aguarda]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [+ Adicionar Pagamento]                                        │
│                                                                 │
│  Total Pago: €500 / €1.000 (50%)                               │
│  Em Falta: €500                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| Migração SQL | Novo | Criar tabela `sale_payments` |
| `src/types/sales.ts` | Modificar | Adicionar tipos para pagamentos |
| `src/hooks/useSalePayments.ts` | Novo | CRUD de pagamentos |
| `src/components/sales/SalePaymentsList.tsx` | Novo | Lista de pagamentos com ações |
| `src/components/sales/AddPaymentModal.tsx` | Novo | Modal para adicionar/editar pagamento |
| `src/components/sales/EditSaleModal.tsx` | Modificar | Integrar secção de pagamentos |
| `src/components/sales/SaleDetailsModal.tsx` | Modificar | Mostrar lista de pagamentos |

---

### Base de Dados: Tabela `sale_payments`

```sql
CREATE TABLE sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,  -- 'mbway', 'transfer', 'cash', 'card', 'check', 'other'
  invoice_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'paid'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org payments"
  ON sale_payments FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert payments"
  ON sale_payments FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update payments"
  ON sale_payments FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can delete payments"
  ON sale_payments FOR DELETE
  USING (organization_id = get_user_org_id(auth.uid()));
```

---

### Interface de Pagamentos

#### No Modal de Edição (EditSaleModal)

Nova secção "Pagamentos" que substitui os campos antigos de pagamento:

```text
┌──────────────────────────────────────────────────────────────┐
│ 💳 PAGAMENTOS                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 15/01/2024  MB Way   €500,00   FT 2024/01  [Pago] [×]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Adicionar Pagamento]                                     │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│  Resumo:                                                     │
│  Total Pago:     €500,00                                     │
│  Em Falta:       €500,00                                     │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Modal "Adicionar Pagamento"

```text
┌──────────────────────────────────────────────────────────────┐
│                   Adicionar Pagamento                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Valor *                           Data do Pagamento *       │
│  [€___________]                    [📅 15/01/2024    ]       │
│                                                              │
│  Método de Pagamento               Estado                    │
│  [MB Way ▼]                        [○ Pago  ○ Agendado]      │
│                                                              │
│  Referência da Fatura                                        │
│  [FT 2024/0001______________]                                │
│                                                              │
│  Notas                                                       │
│  [________________________________]                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [Cancelar]                              [Guardar Pagamento] │
└──────────────────────────────────────────────────────────────┘
```

---

### Tipos TypeScript

```typescript
// src/types/sales.ts - Novos tipos

export type PaymentRecordStatus = 'pending' | 'paid';

export interface SalePayment {
  id: string;
  organization_id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  invoice_reference: string | null;
  status: PaymentRecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_RECORD_STATUS_LABELS: Record<PaymentRecordStatus, string> = {
  pending: 'Agendado',
  paid: 'Pago',
};
```

---

### Hook: useSalePayments

```typescript
// src/hooks/useSalePayments.ts

export function useSalePayments(saleId: string | undefined) {
  return useQuery({
    queryKey: ["sale-payments", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_payments")
        .select("*")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: true });
      if (error) throw error;
      return data as SalePayment[];
    },
    enabled: !!saleId,
  });
}

export function useCreateSalePayment() { /* ... */ }
export function useUpdateSalePayment() { /* ... */ }
export function useDeleteSalePayment() { /* ... */ }
```

---

### Componente: SalePaymentsList

```typescript
interface SalePaymentsListProps {
  saleId: string;
  saleTotal: number;
  readonly?: boolean;
  onAddPayment?: () => void;
}
```

Funcionalidades:
- Lista todos os pagamentos da venda
- Mostra estado (badge Pago/Agendado)
- Permite editar/eliminar pagamentos
- Calcula total pago vs. em falta
- Barra de progresso visual

---

### Lógica de Cálculo

```typescript
// Total pago = soma de pagamentos com status 'paid'
const totalPaid = payments
  .filter(p => p.status === 'paid')
  .reduce((sum, p) => sum + p.amount, 0);

// Em falta = total da venda - total pago
const remaining = saleTotal - totalPaid;

// Percentagem paga
const percentage = (totalPaid / saleTotal) * 100;

// Estado do pagamento da venda (auto-calculado)
const paymentStatus = 
  totalPaid === 0 ? 'pending' :
  totalPaid >= saleTotal ? 'paid' :
  'partial';
```

---

### Migração de Dados Existentes

A migração SQL incluirá código para converter dados existentes:

```sql
-- Migrar pagamentos existentes (se houver paid_date)
INSERT INTO sale_payments (organization_id, sale_id, amount, payment_date, payment_method, invoice_reference, status)
SELECT 
  organization_id,
  id as sale_id,
  total_value as amount,
  COALESCE(paid_date, sale_date) as payment_date,
  payment_method,
  invoice_reference,
  CASE WHEN payment_status = 'paid' THEN 'paid' ELSE 'pending' END as status
FROM sales
WHERE payment_status = 'paid' OR invoice_reference IS NOT NULL;
```

---

### Fluxo de Utilização

```text
1. Utilizador abre venda existente
2. Vê secção de pagamentos (vazia ou com histórico)
3. Clica "+ Adicionar Pagamento"
4. Modal abre com campos:
   - Valor (ex: €500)
   - Data (ex: hoje)
   - Método (ex: MB Way)
   - Fatura (ex: FT 2024/0001)
   - Estado (Pago ou Agendado)
5. Guarda pagamento
6. Lista atualiza com novo pagamento
7. Resumo mostra "Total Pago: €500 / €1.000"
8. Pode adicionar mais pagamentos
9. Quando total pago = total da venda, estado muda para "Pago"
```

---

### Vantagens desta Abordagem

| Benefício | Descrição |
|-----------|-----------|
| Múltiplos pagamentos | Adiantamento + Entrega + Parcelas |
| Fatura por pagamento | Cada recebimento pode ter a sua fatura |
| Histórico completo | Registo de quando/como foi pago |
| Pagamentos agendados | Marcar pagamentos futuros |
| Cálculo automático | Estado da venda atualiza automaticamente |

---

### Resumo de Implementação

| Componente | Ação |
|------------|------|
| Migração SQL | Criar tabela `sale_payments` + RLS + migrar dados |
| `src/types/sales.ts` | Adicionar tipos de pagamento |
| `src/hooks/useSalePayments.ts` | Criar (CRUD completo) |
| `src/components/sales/SalePaymentsList.tsx` | Criar (lista + resumo) |
| `src/components/sales/AddPaymentModal.tsx` | Criar (adicionar/editar) |
| `src/components/sales/EditSaleModal.tsx` | Substituir secção pagamento por nova |
| `src/components/sales/SaleDetailsModal.tsx` | Mostrar lista de pagamentos |

**Total: 1 migração + 2 novos ficheiros + 3 novos componentes + 2 modificações**

