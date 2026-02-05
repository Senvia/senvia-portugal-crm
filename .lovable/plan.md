

## Expandir Módulo Financeiro com Despesas

### Conceito

Adicionar uma secção de **Despesas** ao módulo financeiro para registar e categorizar todos os custos operacionais da empresa. Inclui também uma área nas Configurações para gerir os **Tipos de Despesas** (categorias personalizáveis por organização).

---

### Novas Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Tipos de Despesas | Categorias personalizáveis (Configurações) |
| Registar Despesas | Modal para adicionar despesas com categoria, valor, data |
| Listar Despesas | Tabela filtrada por período, categoria, pesquisa |
| Dashboard atualizado | Novos cards: Total Despesas, Balanço (Receitas - Despesas) |
| Anexar Comprovativos | Upload de ficheiros (PDF/imagem) |

---

### Interface do Dashboard Financeiro (Atualizada)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  💰 FINANCEIRO                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│  Período: [📅 01/01/2026 - 31/01/2026 ▼]                                   │
│                                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │ Faturado  │ │ Recebido  │ │ Pendente  │ │ Despesas  │ │ Balanço   │    │
│  │ €15.000   │ │ €8.500    │ │ €6.500    │ │ €3.200    │ │ €5.300    │    │
│  │           │ │   ↑       │ │           │ │    ↓      │ │ Receitas  │    │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
│                                                                            │
│  [📊 Gráfico com linha de receitas vs despesas]                            │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  Pagamentos  │  │   Faturas    │  │  Despesas    │  ← NOVO CARD         │
│  │  Ver todos   │  │  Ver todas   │  │  Ver todas   │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Nova Página: Despesas (`/financeiro/despesas`)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  📤 DESPESAS                                        [+ Adicionar Despesa]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  [🔍 Pesquisar...] [📅 Período ▼] [Categoria ▼] [× Limpar] [Exportar]     │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Data       │ Descrição      │ Categoria    │ Valor   │ Anexo │ Ações  ││
│  ├────────────────────────────────────────────────────────────────────────┤│
│  │ 04/02/2026 │ Renda escritór │ Instalações  │ €800    │  [📎] │ [✏️🗑️] ││
│  │ 03/02/2026 │ Campanha Meta  │ Marketing    │ €250    │  --   │ [✏️🗑️] ││
│  │ 01/02/2026 │ Licença Adobe  │ Software     │ €59,99  │  [📎] │ [✏️🗑️] ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                            │
│  Total no período: €1.109,99                                               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Modal: Adicionar/Editar Despesa

```text
┌──────────────────────────────────────────────────────────────────┐
│  ✖  Adicionar Despesa                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Descrição *                                                     │
│  [Renda do escritório de Janeiro____________________]            │
│                                                                  │
│  Categoria *                     Valor *                         │
│  [Instalações              ▼]    [€ 800,00        ]              │
│                                                                  │
│  Data *                          Recorrente?                     │
│  [📅 01/02/2026            ]     [ ] Sim                         │
│                                                                  │
│  Notas                                                           │
│  [__________________________________________________]            │
│                                                                  │
│  📎 Anexar Comprovativo                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [PDF Icon] recibo-renda.pdf              [× Remover]      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│                              [Cancelar]  [Guardar]               │
└──────────────────────────────────────────────────────────────────┘
```

---

### Nova Secção nas Configurações: Tipos de Despesas

Adicionar nova tab "Despesas" nas Configurações (similar a "Produtos"):

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ CONFIGURAÇÕES                                                          │
├────────────────────────────────────────────────────────────────────────────┤
│  [Geral] [Equipa] [Pipeline] [Módulos] [Formulário] [Produtos]            │
│  [Campos] [Alertas] [Despesas] [Integrações]                  ← NOVA TAB  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  📂 Tipos de Despesas                                   [+ Adicionar]      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Instalações         Renda, água, eletricidade...        [✏️] [🗑️]  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Marketing           Publicidade, anúncios, eventos      [✏️] [🗑️]  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Software            Licenças, subscrições, ferramentas  [✏️] [🗑️]  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Pessoal             Salários, formação, benefícios      [✏️] [🗑️]  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Operacional         Material, combustível, manutenção   [✏️] [🗑️]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Arquitetura de Base de Dados

#### Nova Tabela: `expense_categories`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| organization_id | UUID | FK para organizations |
| name | TEXT | Nome da categoria |
| description | TEXT | Descrição opcional |
| color | TEXT | Cor para badges (hex) |
| is_active | BOOLEAN | Se está ativa |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

#### Nova Tabela: `expenses`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| organization_id | UUID | FK para organizations |
| category_id | UUID | FK para expense_categories |
| description | TEXT | Descrição da despesa |
| amount | DECIMAL | Valor da despesa |
| expense_date | DATE | Data da despesa |
| is_recurring | BOOLEAN | Se é recorrente |
| notes | TEXT | Notas adicionais |
| receipt_file_url | TEXT | URL do comprovativo |
| created_by | UUID | Quem registou |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

---

### Migração SQL

```sql
-- Tabela de categorias de despesas
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_expense_categories_org ON expense_categories(organization_id);

-- RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_org_access" ON expense_categories
  FOR ALL USING (organization_id = get_user_org_id(auth.uid()));

-- Tabela de despesas
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  notes TEXT,
  receipt_file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_expenses_org ON expenses(organization_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_org_access" ON expenses
  FOR ALL USING (organization_id = get_user_org_id(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Ficheiros a Criar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/types/expenses.ts` | Tipos | Interfaces e constantes |
| `src/hooks/useExpenseCategories.ts` | Hook | CRUD de categorias |
| `src/hooks/useExpenses.ts` | Hook | CRUD de despesas |
| `src/pages/finance/Expenses.tsx` | Página | Listagem de despesas |
| `src/components/finance/AddExpenseModal.tsx` | Componente | Modal criar despesa |
| `src/components/finance/EditExpenseModal.tsx` | Componente | Modal editar despesa |
| `src/components/settings/ExpenseCategoriesTab.tsx` | Componente | Gestão de categorias |
| `src/components/settings/CreateExpenseCategoryModal.tsx` | Componente | Modal criar categoria |
| `src/components/settings/EditExpenseCategoryModal.tsx` | Componente | Modal editar categoria |

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/App.tsx` | Adicionar rota `/financeiro/despesas` |
| `src/pages/Finance.tsx` | Novo card de despesas, métricas atualizadas |
| `src/pages/Settings.tsx` | Nova tab "Despesas" |
| `src/components/settings/MobileSettingsNav.tsx` | Nova secção "Despesas" |
| `src/hooks/useFinanceStats.ts` | Incluir totalExpenses e balance |
| `src/types/finance.ts` | Adicionar campos de despesas ao FinanceStats |

---

### Tipos TypeScript

```typescript
// src/types/expenses.ts

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  notes: string | null;
  receipt_file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

// Categorias padrão para novas organizações
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Instalações', description: 'Renda, água, eletricidade, internet', color: '#3b82f6' },
  { name: 'Marketing', description: 'Publicidade, anúncios, eventos', color: '#f59e0b' },
  { name: 'Software', description: 'Licenças, subscrições, ferramentas', color: '#8b5cf6' },
  { name: 'Pessoal', description: 'Salários, formação, benefícios', color: '#10b981' },
  { name: 'Operacional', description: 'Material, combustível, manutenção', color: '#ef4444' },
];
```

---

### Atualização do FinanceStats

```typescript
// src/types/finance.ts (atualizado)

export interface FinanceStats {
  // Existentes
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  receivedThisMonth: number;
  dueSoon: number;
  dueSoonCount: number;
  dueSoonPayments: PaymentWithSale[];
  cashflowTrend: CashflowPoint[];
  
  // Novos campos
  totalExpenses: number;         // Total de despesas no período
  expensesThisMonth: number;     // Despesas do mês atual
  balance: number;               // receivedThisMonth - expensesThisMonth
}

export interface CashflowPoint {
  date: string;
  received: number;
  scheduled: number;
  expenses: number;  // NOVO: despesas por dia
}
```

---

### Fluxo de Implementação

| Passo | Tipo | Descrição |
|-------|------|-----------|
| 1 | Migração SQL | Criar tabelas expense_categories e expenses |
| 2 | Tipos | Criar src/types/expenses.ts |
| 3 | Hooks | Criar useExpenseCategories e useExpenses |
| 4 | Settings | Criar ExpenseCategoriesTab e modais |
| 5 | Settings | Integrar nova tab nas configurações |
| 6 | Página | Criar página de listagem de despesas |
| 7 | Modais | Criar AddExpenseModal e EditExpenseModal |
| 8 | Rota | Adicionar rota no App.tsx |
| 9 | Dashboard | Atualizar Finance.tsx com novos cards |
| 10 | Hook Stats | Atualizar useFinanceStats para incluir despesas |

**Total: 1 migração + 9 novos ficheiros + 6 ficheiros modificados**

---

### Segurança

| Aspecto | Implementação |
|---------|---------------|
| RLS | Políticas por organization_id |
| Storage | Bucket privado `expense-receipts` (similar a invoices) |
| Permissões | Apenas utilizadores autenticados da organização |

