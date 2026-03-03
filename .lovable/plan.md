

## Painel de Compromisso — Dashboard Telecom

### Conceito

No início de cada mês, cada **Comercial** insere o seu compromisso de vendas: uma tabela com linhas onde indica **NIF**, **Energia (MWh)**, **Solar (kWp)** e **Comissão (€)** previstos. O admin/gestor vê o compromisso de todos os comerciais. O painel aparece **apenas no nicho telecom**, como uma secção dedicada acima dos widgets genéricos.

### Estrutura de dados

Nova tabela `monthly_commitments`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `organization_id` | uuid FK | Isolamento tenant |
| `user_id` | uuid FK profiles | Comercial que criou |
| `month` | date | Primeiro dia do mês (ex: 2026-03-01) |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | — |

Nova tabela `commitment_lines`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `commitment_id` | uuid FK | Referência ao compromisso |
| `nif` | text | NIF do cliente/prospect |
| `energia_mwh` | numeric | Volume energia previsto |
| `solar_kwp` | numeric | Capacidade solar prevista |
| `comissao` | numeric | Comissão prevista |
| `proposal_id` | uuid nullable | Proposta que suporta (opcional) |
| `notes` | text nullable | Observações |

RLS: membros da org leem/escrevem nos seus compromissos; admins veem todos.

### UI no Dashboard

Para telecom, o Dashboard ganha uma secção **"Atividade Comercial"** com um card **"Compromisso"**:

```text
┌─────────────────────────────────────────────────┐
│ 📋 Compromisso — Março 2026          [Editar]  │
├─────────────────────────────────────────────────┤
│  NIF      │ Energia │ Solar  │ Comissão        │
│  5081234  │  3528   │  526   │  €3.939         │
│  5089876  │  1200   │  0     │  €1.500         │
├─────────────────────────────────────────────────┤
│  TOTAL    │  4728   │  526   │  €5.439         │
└─────────────────────────────────────────────────┘
```

- O Comercial vê **apenas o seu** compromisso com botão "Editar" para adicionar/remover linhas
- O Admin vê um **select de Comercial** para navegar entre compromissos de todos
- Se não existe compromisso para o mês, aparece CTA "Definir Compromisso"
- Modal de edição: formulário com linhas dinâmicas (adicionar/remover) com campos NIF, Energia, Solar, Comissão e opcionalmente ligar a uma Proposta existente

### Ficheiros a criar/alterar

1. **Migração SQL** — Criar tabelas `monthly_commitments` e `commitment_lines` com RLS
2. **`src/hooks/useCommitments.ts`** — Hook CRUD para compromissos (filtro por mês corrente, user_id)
3. **`src/components/dashboard/CommitmentPanel.tsx`** — Card do compromisso com tabela e totais
4. **`src/components/dashboard/EditCommitmentModal.tsx`** — Modal full-screen responsivo para editar linhas
5. **`src/pages/Dashboard.tsx`** — Adicionar `CommitmentPanel` na secção telecom, dentro de um grupo "Atividade Comercial"

### Faseamento

Esta é a **Fase 1 — Compromisso**. Depois disto, avançamos para:
- Mais painéis de "Atividade Comercial"
- Painel "Ativações"

