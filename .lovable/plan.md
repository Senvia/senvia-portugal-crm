

## Adicionar Tipologia e Consumo Anual para Template Telecomunicações

### Resumo
Adicionar um campo **Tipologia** (EE, Gás, Serviços, EE+Serviços) e substituir **Valor do Negócio** por **Consumo Anual/kWp (kWh)** nos Leads, mas **apenas para organizações com template Telecomunicações**.

---

### 1. Atualização da Base de Dados

Adicionar duas colunas à tabela `leads`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `tipologia` | text | Tipo de serviço: 'ee', 'gas', 'servicos', 'ee_servicos' |
| `consumo_anual` | numeric | Consumo anual em kWh ou potência em kWp |

O campo `value` será **mantido** para outros templates.

---

### 2. Novos Tipos TypeScript

Adicionar em `src/types/index.ts`:

```text
LeadTipologia = 'ee' | 'gas' | 'servicos' | 'ee_servicos'

TIPOLOGIA_LABELS:
  ee         → 'EE'
  gas        → 'Gás'
  servicos   → 'Serviços'
  ee_servicos → 'EE + Serviços'

TIPOLOGIA_STYLES:
  ee         → ⚡ amarelo
  gas        → 🔥 laranja
  servicos   → 🔧 roxo
  ee_servicos → ⚡🔧 verde
```

Atualizar interface `Lead`:
```text
+ tipologia?: LeadTipologia | null
+ consumo_anual?: number | null
```

---

### 3. Lógica Condicional por Nicho

A UI vai verificar `organization.niche === 'telecom'` para:
- **Mostrar Tipologia** em vez de (ou além de) Temperatura
- **Mostrar Consumo Anual (kWh)** em vez de Valor do Negócio (€)

Outros templates continuam a ver Valor do Negócio.

---

### 4. Componentes a Modificar

#### AddLeadModal.tsx
- Verificar `organization.niche`
- Se `telecom`:
  - Adicionar dropdown **Tipologia** (ao lado da Temperatura)
  - Substituir "Valor do Negócio (€)" por "Consumo Anual/kWp (kWh)"
- Atualizar schema zod para os novos campos

#### LeadCard.tsx
- Verificar `organization.niche`
- Se `telecom`:
  - Mostrar badge de Tipologia junto à Temperatura
  - Mostrar Consumo Anual formatado (ex: "125 000 kWh") em vez de €

#### LeadDetailsModal.tsx
- Verificar `organization.niche`
- Se `telecom`:
  - Adicionar dropdown editável para Tipologia
  - Substituir campo "Valor do Negócio" por "Consumo Anual (kWh)"

#### LeadsTableView.tsx
- Verificar `organization.niche`
- Se `telecom`:
  - Adicionar coluna **Tipologia**
  - Mudar coluna "Valor" para "Consumo (kWh)"

---

### 5. Hooks useLeads.ts

Atualizar `useCreateLead` e `useUpdateLead` para aceitar:
```text
tipologia?: LeadTipologia
consumo_anual?: number
```

---

### 6. UI do Dropdown Tipologia

```text
┌────────────────────┐
│ ⚡ EE              │
│ 🔥 Gás             │
│ 🔧 Serviços        │
│ ⚡🔧 EE + Serviços  │
└────────────────────┘
```

---

### 7. Campo Consumo Anual

- Input numérico com sufixo "kWh"
- Formatação com espaços nos milhares (estilo PT)
- Exemplo: `125 000 kWh`

---

### 8. Ficheiros a Modificar

1. **Migração SQL** para tabela `leads` (tipologia + consumo_anual)
2. **`src/types/index.ts`** - Novos tipos e constantes
3. **`src/components/leads/AddLeadModal.tsx`** - Campos condicionais
4. **`src/components/leads/LeadCard.tsx`** - Badge tipologia + consumo
5. **`src/components/leads/LeadDetailsModal.tsx`** - Edição condicional
6. **`src/components/leads/LeadsTableView.tsx`** - Colunas condicionais
7. **`src/hooks/useLeads.ts`** - Mutations atualizadas

---

### 9. Resultado Esperado

Para **organizações com template Telecomunicações**:
- Dropdown "Tipologia" com 4 opções visível nos modais e cartões
- Campo "Consumo Anual/kWp (kWh)" substituindo "Valor do Negócio"
- Badge colorido de tipologia nos cartões do Kanban
- Coluna Tipologia + Consumo na vista de tabela

Para **outros templates** (genérico, clínica, etc.):
- Continua a mostrar "Valor do Negócio (€)"
- Sem campo Tipologia

