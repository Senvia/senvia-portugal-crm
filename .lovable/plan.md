

## Sistema de Pedidos Internos ("Outros")

Nova funcionalidade para comerciais submeterem documentos que precisam de aprovacao e pagamento por parte de um gestor/admin.

---

### Fluxo do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE PEDIDOS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  COMERCIAL                      APROVADOR                    COMERCIAL  │
│  ─────────                      ─────────                    ─────────  │
│                                                                         │
│  1. Submete pedido    ───►   2. Ve na lista      ───►   4. Recebe       │
│     (despesa, ferias,           de pendentes            notificacao     │
│     fatura)                                              "Pago" ou      │
│                              3. Aprova/Rejeita          "Rejeitado"     │
│     - Upload ficheiro           + Regista pagamento                     │
│     - Valor                                                             │
│     - Tipo                                                              │
│     - Descricao                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tipos de Pedido

| Tipo | Descricao | Campos Especificos |
|------|-----------|-------------------|
| `expense` | Despesas pessoais (combustivel, refeicoes) | Valor, Data, Comprovativo |
| `vacation` | Mapas de ferias / Ausencias | Ficheiro Excel/PDF, Periodo |
| `invoice` | Faturas de fornecedores | Valor, Fornecedor, Ficheiro |

---

### Estados do Pedido

| Estado | Cor | Significado |
|--------|-----|-------------|
| `pending` | Amarelo | Aguarda aprovacao |
| `approved` | Azul | Aprovado, aguarda pagamento |
| `paid` | Verde | Pago (concluido) |
| `rejected` | Vermelho | Rejeitado |

---

### Alteracoes Necessarias

#### 1. Base de Dados (nova tabela)

```sql
CREATE TABLE internal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Quem submeteu
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  
  -- Tipo e detalhes
  request_type TEXT NOT NULL CHECK (request_type IN ('expense', 'vacation', 'invoice')),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2), -- Null para ferias
  
  -- Ficheiro anexo
  file_url TEXT,
  
  -- Datas relevantes
  expense_date DATE,
  period_start DATE,
  period_end DATE,
  
  -- Estado e aprovacao
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Pagamento
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Comerciais veem os seus, Admins veem todos
```

#### 2. Storage Bucket

Criar bucket `internal-requests` para guardar ficheiros anexos (PDFs, Excel, etc.)

#### 3. Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/pages/finance/InternalRequests.tsx` | Pagina principal com lista de pedidos |
| `src/components/finance/SubmitRequestModal.tsx` | Modal para comercial submeter pedido |
| `src/components/finance/ReviewRequestModal.tsx` | Modal para admin aprovar/rejeitar/pagar |
| `src/components/finance/RequestsTable.tsx` | Tabela de pedidos com filtros |
| `src/hooks/useInternalRequests.ts` | Hook para CRUD de pedidos |
| `src/types/internal-requests.ts` | Tipos TypeScript |

#### 4. Alteracoes em Ficheiros Existentes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Finance.tsx` | Adicionar tab "Outros" |
| `src/App.tsx` | Adicionar rota `/financeiro/outros` |

---

### Interface do Utilizador

#### Vista do Comercial

```text
┌─────────────────────────────────────────────────┐
│ Outros (Pedidos Internos)                       │
│ ───────────────────────                         │
│                        [+ Novo Pedido]          │
├─────────────────────────────────────────────────┤
│ Filtros: [Tipo ▼] [Estado ▼] [Periodo]          │
├─────────────────────────────────────────────────┤
│ Data    │ Tipo     │ Titulo     │ Valor  │ Est. │
│ 05/02   │ Despesa  │ Combustiv. │ €45    │ 🟡   │
│ 01/02   │ Fatura   │ Fornec. X  │ €230   │ 🟢   │
│ 28/01   │ Ferias   │ Mapa Fev   │ -      │ 🔵   │
└─────────────────────────────────────────────────┘
```

#### Modal de Submissao

```text
┌─────────────────────────────────────────────────┐
│ Novo Pedido                               [X]   │
├─────────────────────────────────────────────────┤
│ Tipo de Pedido                                  │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │ 💰        │ │ 📅        │ │ 📄        │       │
│ │ Despesa   │ │ Ferias    │ │ Fatura    │       │
│ └───────────┘ └───────────┘ └───────────┘       │
│                                                 │
│ Titulo *                                        │
│ [________________________________]              │
│                                                 │
│ Valor (€)           Data                        │
│ [________]          [__/__/____]                │
│                                                 │
│ Descricao                                       │
│ [________________________________]              │
│                                                 │
│ Anexo (PDF, Excel, Imagem)                      │
│ ┌───────────────────────────────────────┐       │
│ │   📎 Arraste ou clique para anexar    │       │
│ └───────────────────────────────────────┘       │
│                                                 │
│              [Cancelar]  [Submeter]             │
└─────────────────────────────────────────────────┘
```

#### Vista do Aprovador (Admin)

- Ve todos os pedidos
- Badge com contagem de pendentes
- Botoes: Aprovar, Rejeitar, Marcar como Pago
- Campo para notas de revisao e referencia de pagamento

---

### Notificacoes

| Evento | Destinatario | Mensagem |
|--------|--------------|----------|
| Novo pedido | Admins | "Novo pedido de [Nome]: [Titulo]" |
| Aprovado | Comercial | "O seu pedido foi aprovado" |
| Pago | Comercial | "O seu pedido foi pago" |
| Rejeitado | Comercial | "O seu pedido foi rejeitado: [Motivo]" |

As notificacoes utilizarao o sistema de push notifications ja existente no projeto.

---

### Secao Tecnica

#### Estrutura de Tipos

```typescript
interface InternalRequest {
  id: string;
  organization_id: string;
  submitted_by: string;
  submitted_at: string;
  request_type: 'expense' | 'vacation' | 'invoice';
  title: string;
  description: string | null;
  amount: number | null;
  file_url: string | null;
  expense_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  // Joins
  submitter?: { full_name: string; avatar_url: string | null };
  reviewer?: { full_name: string };
}
```

#### Politicas RLS

- SELECT: Comerciais veem apenas os seus pedidos, Admins veem todos da organizacao
- INSERT: Qualquer membro autenticado pode submeter
- UPDATE: Apenas Admins podem aprovar/rejeitar/pagar

---

### Resumo de Ficheiros

| Acao | Ficheiro |
|------|----------|
| Criar | `src/types/internal-requests.ts` |
| Criar | `src/hooks/useInternalRequests.ts` |
| Criar | `src/pages/finance/InternalRequests.tsx` |
| Criar | `src/components/finance/SubmitRequestModal.tsx` |
| Criar | `src/components/finance/ReviewRequestModal.tsx` |
| Criar | `src/components/finance/RequestsTable.tsx` |
| Editar | `src/pages/Finance.tsx` (adicionar tab) |
| Editar | `src/App.tsx` (adicionar rota) |
| Migrar | Nova tabela + bucket + RLS |

**Total: 6 ficheiros novos, 2 editados, 1 migracao SQL**

