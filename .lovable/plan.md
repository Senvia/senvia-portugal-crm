

## Objetivo Mensal — Painel com 3 secções

O painel atual ("Compromisso") será renomeado para **"Objetivo Mensal"** e expandido com duas novas sub-tabelas: **Vendas** e **Concretização do Objetivo**.

### Estrutura Visual

```text
┌─────────────────────────────────────────────────────┐
│ 🎯 Objetivo Mensal — março 2026                 ✏️  │
│                                                     │
│ ── A) OBJETIVO (já existe — dados do compromisso) ──│
│ Consultor │ NIF │ Energia │ Solar │ Comissão        │
│ André     │  6  │  500    │  30   │  400 €          │
│                                                     │
│ ── B) VENDAS (dados reais das sales do mês) ────────│
│ Consultor │ NIF │ Energia │ Solar │ Comissão        │
│ André     │  3  │  300    │  35   │  470 €          │
│                                                     │
│ ── C) CONCRETIZAÇÃO (% = Vendas / Objetivo) ────────│
│ Consultor │ NIF  │ Energia │ Solar  │ Comissão      │
│ André     │ 50%  │  60%    │ 117%   │  118%         │
└─────────────────────────────────────────────────────┘
```

### Alterações

**1. Novo hook `useMonthSalesMetrics.ts`**
- Query à tabela `sales` filtrada por `organization_id` e `sale_date` do mês atual
- Agrupa por `created_by` (user_id do comercial)
- Calcula por utilizador:
  - **NIFs**: count de vendas distintas (ou count de `client_id` distintos)
  - **Energia**: SUM de `consumo_anual` / 1000 (converte kWh → MWh)
  - **Solar**: SUM de `kwp` (apenas `proposal_type = 'servicos'`)
  - **Comissão**: SUM de `comissao`
- Exclui vendas canceladas (`status != 'cancelled'`)

**2. Refactor `CommitmentPanel.tsx` → expandir**
- Renomear título para "Objetivo Mensal"
- Dividir em 3 secções com labels (A, B, C) usando sub-headers na tabela ou separadores visuais
- **Secção A — Objetivo**: tabela existente (dados do `monthly_commitments`)
- **Secção B — Vendas**: nova tabela com dados reais do hook `useMonthSalesMetrics`
- **Secção C — Concretização**: tabela calculada = (Vendas / Objetivo) × 100, incluindo coluna NIF%
- Todas as secções respeitam o filtro `selectedMemberId`
- Admin vê footer com totais; comercial vê só a sua linha

**3. Ficheiros alterados**
- `src/hooks/useMonthSalesMetrics.ts` — novo
- `src/components/dashboard/CommitmentPanel.tsx` — refactor completo

