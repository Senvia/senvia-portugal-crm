

## Novo Card "Métricas Mensais" no Dashboard

### Entendimento

Baseado nas imagens de referência, o card "Métricas Mensais" é um **terceiro card** independente dos outros dois (Compromisso + Objetivo Mensal). Tem uma estrutura de **6 colunas de dados** (não 4 como os outros):

```text
Consultor | OP | ENERGIA | OP | SOLAR | OP | COMISSÃO
```

Onde "OP" aparece 3 vezes — representa o número de operações/contratos para cada categoria (Energia, Solar, Comissão). Os targets são definidos pelo admin ou utilizador com permissões.

Contém duas secções:
- **A) Ritmo** — valores reais/ritmo atual (dados calculados das vendas do mês)
- **B) Concretização das Métricas** — percentagem = Ritmo / Métricas target

```text
┌──────────────────────────────────────────────────────┐
│ 📈 Métricas Mensais — março 2026              [✏️]   │
│                                                      │
│ ── A) Ritmo ──────────────────────────────────────── │
│ Consultor  | OP | ENERGIA | OP | SOLAR | OP | COMIS. │
│ André      | 12 |  3317   |  1 |  365  | 13 |  4626 │
│                                                      │
│ ── B) Concretização das Métricas ─────────────────── │
│ André      | 48%|  133%   | 20%|  243% | 43%|   93% │
└──────────────────────────────────────────────────────┘
```

### Alterações

**1. Nova tabela `monthly_metrics`** (migração SQL)
- Colunas: `id`, `organization_id`, `user_id`, `month`, `op_energia` (int), `energia` (numeric), `op_solar` (int), `solar` (numeric), `op_comissao` (int), `comissao` (numeric), `created_by`, `created_at`, `updated_at`
- Unique constraint: `(organization_id, user_id, month)`
- RLS: leitura para membros da org, escrita para admin/super_admin

**2. Novo hook `useMonthlyMetrics.ts`**
- Query e upsert na tabela `monthly_metrics`
- Admin define targets por colaborador

**3. Novo componente `MetricsPanel.tsx`**
- Card com ícone e título "Métricas Mensais — mês"
- Botão editar visível para admin
- Secção A) Ritmo — dados reais do `useMonthSalesMetrics` (OP = contagem de vendas por tipo)
- Secção B) Concretização — % = Ritmo / Métricas target
- 6 colunas: OP, Energia, OP, Solar, OP, Comissão
- Tabela com scroll horizontal em mobile
- Linha TOTAL para admin com múltiplos colaboradores
- Respeita filtro `useTeamFilter`

**4. Novo modal `EditMetricsModal.tsx`**
- Admin seleciona colaborador e define os 6 valores target
- Campos: OP Energia, Energia (MWh), OP Solar, Solar (kWp), OP Comissão, Comissão (€)

**5. `Dashboard.tsx`** — adicionar o terceiro card na grid de "Atividade Comercial"
- Mudar grid para 3 colunas em desktop: `grid-cols-1 lg:grid-cols-3`

### Ficheiros
- Migração SQL: nova tabela `monthly_metrics`
- `src/hooks/useMonthlyMetrics.ts` — novo
- `src/components/dashboard/MetricsPanel.tsx` — novo
- `src/components/dashboard/EditMetricsModal.tsx` — novo
- `src/pages/Dashboard.tsx` — adicionar MetricsPanel

