

## Nova Secção "Ativações" no Dashboard

### Contexto
As vendas têm `activation_date` e `proposal_type` (energia/servicos). Precisamos de uma nova tabela `activation_objectives` para guardar os targets definidos pelo admin, e um novo componente que mostre 4 pares (objetivo vs atingimento) com donut charts.

### 1. Nova tabela: `activation_objectives`

```sql
CREATE TABLE public.activation_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('monthly','annual')),
  proposal_type text NOT NULL CHECK (proposal_type IN ('energia','servicos')),
  month date NOT NULL, -- 1º dia do mês (mensal) ou 1º dia do ano (anual)
  target_quantity integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id, period_type, proposal_type, month)
);

ALTER TABLE public.activation_objectives ENABLE ROW LEVEL SECURITY;

-- Admins manage
CREATE POLICY "Admins manage activation_objectives" ON public.activation_objectives
  FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Members view
CREATE POLICY "Members view activation_objectives" ON public.activation_objectives
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- Super admin
CREATE POLICY "Super admin full access activation_objectives" ON public.activation_objectives
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
```

### 2. Novo hook: `useActivationObjectives.ts`
- Busca targets da tabela `activation_objectives` para o mês/ano atual
- Mutation `upsert` para o admin definir targets
- Busca vendas com `activation_date` preenchida agrupadas por `proposal_type` e `created_by` para calcular atingimento

### 3. Novo componente: `ActivationsPanel.tsx`
Layout com 4 blocos em grid 2x2 (mobile: 1 coluna):

```text
┌─────────────────────────┬─────────────────────────┐
│  Energia Mensal         │  Serviços Mensal        │
│  🎯 Obj: 10  ✅ Ativ: 4 │  🎯 Obj: 5  ✅ Ativ: 1  │
│  [Donut 40%]            │  [Donut 20%]            │
│  Por consultor (tabela) │  Por consultor (tabela) │
├─────────────────────────┼─────────────────────────┤
│  Energia Anual          │  Serviços Anual         │
│  🎯 Obj: 120 ✅ Ativ: 48│  🎯 Obj: 60 ✅ Ativ: 12 │
│  [Donut 40%]            │  [Donut 20%]            │
│  Por consultor (tabela) │  Por consultor (tabela) │
└─────────────────────────┴─────────────────────────┘
```

Cada bloco contém:
- **Donut chart** (recharts `PieChart`) mostrando % atingimento com cor (verde ≥100%, amarelo ≥50%, vermelho <50%)
- **Tabela** por consultor: Nome | Objetivo | Ativações | %
- **Linha TOTAL** para admin
- Botão editar (lápis) para admin definir objetivos por consultor

### 4. Dashboard.tsx
Adicionar `<ActivationsPanel />` logo abaixo de `<MetricsPanel />`, dentro da secção "Atividade Comercial".

### Lógica de cálculo de ativações
- **Mensal**: vendas com `activation_date` no mês atual, filtradas por `proposal_type`
- **Anual**: vendas com `activation_date` no ano atual, filtradas por `proposal_type`
- Agrupadas por `created_by` para mostrar por consultor

### Ficheiros a criar/editar
- **Criar**: `src/hooks/useActivationObjectives.ts`
- **Criar**: `src/components/dashboard/ActivationsPanel.tsx`
- **Criar**: `src/components/dashboard/EditActivationObjectivesModal.tsx`
- **Editar**: `src/pages/Dashboard.tsx` (adicionar import + componente)
- **Migração**: 1 tabela nova com RLS

