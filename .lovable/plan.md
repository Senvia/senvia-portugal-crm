

## Novo Modulo: Financeiro

### Conceito

O modulo Financeiro sera o centro de controlo financeiro da empresa, importando automaticamente todos os pagamentos registados nas vendas e oferecendo uma visao completa de:

- Pagamentos recebidos
- Pagamentos pendentes/agendados
- Faturas emitidas
- Fluxo de caixa
- Previsao de recebimentos

---

### Estrutura do Modulo

```text
/financeiro
├── Dashboard Financeiro (pagina principal)
│   ├── Cards de Resumo (Total Recebido, Pendente, A Vencer)
│   ├── Grafico de Fluxo de Caixa (ultimos 30 dias)
│   └── Lista de Proximos Recebimentos
│
├── /financeiro/pagamentos
│   └── Tabela de todos os pagamentos (filtros por estado, data, venda)
│
└── /financeiro/faturas
    └── Tabela de faturas com referencia
```

---

### Ficheiros a Criar

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/pages/Finance.tsx` | Novo | Pagina principal do modulo financeiro |
| `src/pages/finance/Payments.tsx` | Novo | Lista de todos os pagamentos |
| `src/pages/finance/Invoices.tsx` | Novo | Lista de faturas |
| `src/hooks/useFinanceStats.ts` | Novo | Estatisticas financeiras agregadas |
| `src/hooks/useAllPayments.ts` | Novo | Buscar todos os pagamentos da organizacao |

---

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/hooks/useModules.ts` | Adicionar modulo 'finance' |
| `src/components/settings/ModulesTab.tsx` | Adicionar card do modulo financeiro |
| `src/components/layout/AppSidebar.tsx` | Adicionar link para Financeiro |
| `src/components/layout/MobileBottomNav.tsx` | Adicionar link para Financeiro |
| `src/App.tsx` | Adicionar rotas do modulo financeiro |

---

### Interface do Modulo Financeiro

#### Dashboard Principal (`/financeiro`)

```text
┌────────────────────────────────────────────────────────────────────┐
│  💰 FINANCEIRO                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ Total       │  │ Recebido    │  │ Pendente    │  │ A Vencer  │ │
│  │ Faturado    │  │ Este Mes    │  │ de Receber  │  │ Proximos  │ │
│  │             │  │             │  │             │  │ 7 dias    │ │
│  │  €15.000    │  │  €8.500     │  │  €6.500     │  │  €2.000   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📊 FLUXO DE CAIXA (ultimos 30 dias)                         │ │
│  │  [Area Chart: Recebido vs Agendado por dia]                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📅 PROXIMOS RECEBIMENTOS                                    │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  05 Fev │ Venda #0012 │ João Silva    │ €500   │ [Agendado]  │ │
│  │  08 Fev │ Venda #0015 │ Maria Santos  │ €1.200 │ [Agendado]  │ │
│  │  10 Fev │ Venda #0018 │ Pedro Costa   │ €300   │ [Agendado]  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  📄 Submenu                                                    ││
│  │  [Todos os Pagamentos]  [Faturas]                              ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

#### Lista de Pagamentos (`/financeiro/pagamentos`)

```text
┌────────────────────────────────────────────────────────────────────┐
│  💳 PAGAMENTOS                                     [Exportar CSV]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Filtros: [Estado ▼] [Data De/Ate] [Pesquisar...]                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Data       │ Venda   │ Cliente      │ Valor  │ Metodo  │ Estado││
│  ├────────────────────────────────────────────────────────────────┤│
│  │ 04/02/2026 │ #0015   │ João Silva   │ €500   │ MB Way  │ Pago  ││
│  │ 01/02/2026 │ #0012   │ Maria Santos │ €300   │ Transf  │ Pago  ││
│  │ 15/02/2026 │ #0012   │ Maria Santos │ €300   │ --      │ Agend ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

#### Lista de Faturas (`/financeiro/faturas`)

```text
┌────────────────────────────────────────────────────────────────────┐
│  📄 FATURAS                                        [Exportar CSV]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Filtros: [Pesquisar referencia...]                               │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Referencia   │ Data       │ Venda   │ Valor  │ Cliente         ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │ FT 2026/001  │ 04/02/2026 │ #0015   │ €500   │ João Silva      ││
│  │ FT 2026/002  │ 01/02/2026 │ #0012   │ €600   │ Maria Santos    ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

### Hook: useFinanceStats

Calcula metricas agregadas de todos os pagamentos:

```typescript
interface FinanceStats {
  // Totais
  totalBilled: number;           // Soma de todas as vendas
  totalReceived: number;         // Pagamentos com status 'paid'
  totalPending: number;          // Pagamentos com status 'pending'
  
  // Este mes
  receivedThisMonth: number;
  pendingThisMonth: number;
  
  // Proximos 7 dias
  dueSoon: number;
  dueSoonPayments: PaymentWithSale[];
  
  // Trend (ultimos 30 dias)
  cashflowTrend: { date: string; received: number; pending: number }[];
}
```

---

### Hook: useAllPayments

Busca todos os pagamentos com informacao da venda associada:

```typescript
interface PaymentWithSale extends SalePayment {
  sale: {
    id: string;
    code: string;
    total_value: number;
    lead?: { name: string } | null;
    client?: { name: string } | null;
  };
}
```

Query:
```sql
SELECT 
  sp.*,
  s.code as sale_code,
  s.total_value as sale_total,
  l.name as lead_name,
  c.name as client_name
FROM sale_payments sp
JOIN sales s ON s.id = sp.sale_id
LEFT JOIN leads l ON l.id = s.lead_id
LEFT JOIN crm_clients c ON c.id = s.client_id
WHERE sp.organization_id = ?
ORDER BY sp.payment_date DESC
```

---

### Integracao com Modulos

O modulo financeiro:
- Le dados de `sale_payments` (criados nas vendas)
- Nao cria pagamentos diretamente (sao criados nas vendas)
- Apresenta uma visao consolidada e analitica

Dependencia:
```text
Vendas → Pagamentos → Financeiro (visualizacao)
```

---

### Detalhes Tecnicos

#### 1. Tipos (src/types/finance.ts)

```typescript
export interface PaymentWithSale {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  invoice_reference: string | null;
  status: PaymentRecordStatus;
  notes: string | null;
  sale: {
    id: string;
    code: string;
    total_value: number;
  };
  client_name: string | null;
  lead_name: string | null;
}

export interface FinanceStats {
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  receivedThisMonth: number;
  dueSoon: number;
  dueSoonPayments: PaymentWithSale[];
  cashflowTrend: CashflowPoint[];
}

export interface CashflowPoint {
  date: string;
  received: number;
  scheduled: number;
}
```

#### 2. Adicionar ao useModules.ts

```typescript
export interface EnabledModules {
  proposals: boolean;
  calendar: boolean;
  sales: boolean;
  ecommerce: boolean;
  clients: boolean;
  marketing: boolean;
  finance: boolean;  // NOVO
}

export const DEFAULT_MODULES: EnabledModules = {
  // ... existentes
  finance: true,  // Ativo por defeito (importante)
};
```

#### 3. Navegacao (AppSidebar + MobileBottomNav)

Adicionar item:
```typescript
{ 
  to: "/financeiro", 
  icon: Wallet, 
  label: "Financeiro", 
  moduleKey: 'finance' 
}
```

Posicao: Depois de "Vendas" (faz sentido logicamente).

#### 4. Rotas (App.tsx)

```tsx
import Finance from "./pages/Finance";
import FinancePayments from "./pages/finance/Payments";
import FinanceInvoices from "./pages/finance/Invoices";

// Protected Routes
<Route path="/financeiro" element={
  <ProtectedRoute><Finance /></ProtectedRoute>
} />
<Route path="/financeiro/pagamentos" element={
  <ProtectedRoute><FinancePayments /></ProtectedRoute>
} />
<Route path="/financeiro/faturas" element={
  <ProtectedRoute><FinanceInvoices /></ProtectedRoute>
} />
```

---

### Componentes a Criar

| Componente | Descricao |
|------------|-----------|
| `FinanceStatsCards.tsx` | Cards de metricas (recebido, pendente, etc.) |
| `CashflowChart.tsx` | Grafico de fluxo de caixa (Area Chart) |
| `UpcomingPaymentsList.tsx` | Lista de proximos recebimentos |
| `PaymentsTable.tsx` | Tabela de pagamentos com filtros |
| `InvoicesTable.tsx` | Tabela de faturas |

---

### Funcionalidades Extras (Futuro)

Estas funcionalidades podem ser adicionadas depois:

- [ ] Exportar para Excel/CSV
- [ ] Filtro por periodo personalizado
- [ ] Marcar pagamento como recebido diretamente
- [ ] Alertas de pagamentos vencidos
- [ ] Integracao com software de faturacao

---

### Resumo de Implementacao

| Ficheiro | Tipo |
|----------|------|
| `src/types/finance.ts` | Novo |
| `src/hooks/useFinanceStats.ts` | Novo |
| `src/hooks/useAllPayments.ts` | Novo |
| `src/pages/Finance.tsx` | Novo |
| `src/pages/finance/Payments.tsx` | Novo |
| `src/pages/finance/Invoices.tsx` | Novo |
| `src/hooks/useModules.ts` | Modificar |
| `src/components/settings/ModulesTab.tsx` | Modificar |
| `src/components/layout/AppSidebar.tsx` | Modificar |
| `src/components/layout/MobileBottomNav.tsx` | Modificar |
| `src/App.tsx` | Modificar |

**Total: 6 novos ficheiros + 5 modificacoes**

