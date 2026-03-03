

## Separar Compromisso (pessoal) vs Objetivo Mensal (admin)

### Entendimento

Existem **2 conceitos distintos**:

1. **Compromisso** — O colaborador logado define os seus **próprios** targets (NIFs, Energia, Solar, Comissão). Card simples com botão editar. Cada um define o seu.

2. **Objetivo Mensal** — Definido pelo **Admin** para cada colaborador. Contém dentro:
   - **A) Vendas** — dados reais do mês (do `useMonthSalesMetrics`)
   - **B) Concretização do Objetivo** — % = Vendas / Objetivo (definido pelo admin)

```text
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│ 🎯 Compromisso — março 2026 │  │ 📊 Objetivo Mensal — março 2026  │
│ [Editar pelo próprio user]   │  │ [Editar só admin]                │
│                              │  │                                  │
│ NIFs | Energia | Solar | €   │  │ ── A) Vendas ──────────────────  │
│  5   |  12 MWh | 8 kWp| 400 │  │ André | 3 | 300 MWh | 470 €     │
│                              │  │                                  │
│                              │  │ ── B) Concretização ───────────  │
│                              │  │ André | 50% | 60% | 118%        │
└──────────────────────────────┘  └──────────────────────────────────┘
```

### Alterações

**1. Nova tabela `monthly_objectives`** (migração SQL)
- Estrutura igual a `monthly_commitments` mas com significado diferente: é o objetivo definido pelo admin para cada colaborador
- Colunas: `id`, `organization_id`, `user_id` (o colaborador alvo), `month`, `total_nifs`, `total_energia_mwh`, `total_solar_kwp`, `total_comissao`, `created_by` (quem definiu — o admin), `created_at`, `updated_at`
- Unique constraint: `(organization_id, user_id, month)`
- RLS: leitura para membros da org, escrita apenas para admins

**2. Novo hook `useMonthlyObjectives.ts`**
- Query e upsert na nova tabela `monthly_objectives`
- Admin pode definir/editar o objetivo de qualquer colaborador
- Colaboradores veem apenas (read-only)

**3. `CommitmentPanel.tsx` — manter como "Compromisso"**
- Renomear título de volta para "Compromisso"
- Mostra **apenas** os dados do utilizador logado (sem tabela multi-user)
- Cada colaborador edita o seu próprio compromisso

**4. `SalesPerformancePanel.tsx` → renomear para "Objetivo Mensal"**
- Usa os dados da nova tabela `monthly_objectives` (em vez de `monthly_commitments`) para calcular concretização
- Admin vê botão editar para definir objetivos de cada colaborador
- Colaboradores veem read-only
- Mantém secções A) Vendas e B) Concretização

**5. Novo modal `EditObjectiveModal.tsx`**
- Permite ao admin selecionar um colaborador e definir os targets desse colaborador
- Só visível para quem tem permissão de admin

**6. `Dashboard.tsx`** — sem alterações de layout (já renderiza ambos os cards)

### Ficheiros
- Migração SQL: nova tabela `monthly_objectives`
- `src/hooks/useMonthlyObjectives.ts` — novo
- `src/components/dashboard/EditObjectiveModal.tsx` — novo
- `src/components/dashboard/CommitmentPanel.tsx` — simplificar (só user logado)
- `src/components/dashboard/SalesPerformancePanel.tsx` — usar objectives do admin

