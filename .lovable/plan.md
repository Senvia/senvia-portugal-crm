

## Plano: Módulo de Comissões Mensais (Financeiro)

Novo módulo dentro do Financeiro que permite ao admin "fechar" um mês, calculando as comissões reais de energia com base no volume agregado por comercial.

---

### Lógica de negócio

1. **Agrupar vendas com status `delivered` (Concluída)** por mês (usando `sale_date`) e por comercial (`leads.assigned_to` via `sales.lead_id`)
2. **Somar `consumo_anual`** de todos os `proposal_cpes` dessas vendas → determina o patamar de volume (Low/Mid/High) por comercial
3. **Recalcular comissão** de cada CPE usando esse patamar agregado (via `calculateEnergyCommissionPure`)
4. **Preview** antes de confirmar → admin vê o resumo por comercial e os valores recalculados
5. **Fechar mês** → grava os valores finais na nova tabela

---

### 1. Base de dados — 2 tabelas novas

**`commission_closings`** — registo de cada fechamento mensal
- `id`, `organization_id`, `month` (date, 1º dia do mês), `closed_by` (uuid), `closed_at` (timestamptz), `total_commission` (numeric), `notes` (text), `created_at`
- Unique: `(organization_id, month)`

**`commission_closing_items`** — detalhe por comercial
- `id`, `closing_id` (FK), `organization_id`, `user_id` (comercial), `total_consumo_mwh` (numeric), `volume_tier` (text: low/mid/high), `total_commission` (numeric), `items_detail` (jsonb — array com cada CPE: sale_id, proposal_cpe_id, consumo_anual, margem, comissao_indicativa, comissao_final), `created_at`

RLS: mesmas políticas da organização (org members view, admin manage).

### 2. Permissões — adicionar subárea ao MODULE_SCHEMA

**Ficheiro:** `src/hooks/useOrganizationProfiles.ts`

Adicionar ao módulo `finance`:
```
commissions: { label: 'Comissões', actions: ['view', 'manage'] }
```

### 3. Frontend — nova aba "Comissões" no Financeiro

**Ficheiro:** `src/pages/Finance.tsx`
- Adicionar `<TabsTrigger value="comissoes">Comissões</TabsTrigger>` (visível apenas para nicho telecom)
- Conteúdo: novo componente `CommissionsTab`

**Novo ficheiro:** `src/components/finance/CommissionsTab.tsx`
- Seletor de mês/ano
- Botão "Fechar Mês" (se o mês ainda não foi fechado e user tem permissão `finance.commissions.manage`)
- Se já fechado: tabela com resultados por comercial (nome, consumo total MWh, patamar, comissão total, expandir para ver CPEs)
- Se não fechado: botão abre modal de preview

**Novo ficheiro:** `src/components/finance/CloseMonthModal.tsx`
- Busca vendas `delivered` do mês selecionado
- Agrupa por comercial (assigned_to do lead)
- Para cada comercial: soma consumo_anual → calcula patamar → recalcula comissão de cada CPE
- Preview com tabela: Comercial | MWh Total | Patamar | Comissão Indicativa (soma original) | Comissão Final (recalculada)
- Botão "Confirmar Fechamento" → insere `commission_closings` + `commission_closing_items`

**Novo ficheiro:** `src/hooks/useCommissionClosings.ts`
- Queries: listar fechamentos por organização, verificar se mês já está fechado
- Mutation: criar fechamento (closing + items)

### 4. Routing

**Ficheiro:** `src/App.tsx`
- Sem rota nova necessária — é uma tab dentro de `/financeiro`

### Resumo de ficheiros

| Ação | Ficheiro |
|------|---------|
| Migração DB | 2 tabelas + RLS |
| Editar | `src/hooks/useOrganizationProfiles.ts` (adicionar subárea) |
| Editar | `src/pages/Finance.tsx` (nova tab) |
| Criar | `src/components/finance/CommissionsTab.tsx` |
| Criar | `src/components/finance/CloseMonthModal.tsx` |
| Criar | `src/hooks/useCommissionClosings.ts` |

