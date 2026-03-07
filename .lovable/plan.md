

## Sistema de Comissões por Percentagem sobre Vendas

### Conceito

Adicionar uma funcionalidade de comissão baseada em percentagem sobre o valor da venda (`total_value`), ativável nas Regras de Vendas. Duas modalidades mutuamente exclusivas:
- **Percentagem Global**: aplica-se a todos os comerciais (quando preenchida, bloqueia a individual)
- **Percentagem Individual**: definida por colaborador na ficha do membro (apenas quando a global está vazia/zero)

### Alterações

**1. `src/components/settings/SalesSettingsTab.tsx`**
- Novo Switch "Comissões sobre vendas"
- Quando ativo, mostra campo de percentagem global (ex: 10%)
- Nota explicativa: "Quando a percentagem global está preenchida, todos os comerciais recebem essa %. Se deixar vazio, pode definir % individual na ficha de cada colaborador."
- Guardar em `sales_settings.commissions_enabled` (boolean) e `sales_settings.commission_percentage` (number | null)

**2. `src/components/settings/TeamTab.tsx`** (ou modal de edição de membro)
- Na ficha do colaborador, adicionar campo "Comissão (%)" — visível apenas quando `commissions_enabled = true` e `commission_percentage` global é null/0
- Guardar na tabela `organization_members` numa nova coluna `commission_rate` (numeric, nullable)

**3. Database Migration**
- `ALTER TABLE organization_members ADD COLUMN commission_rate numeric DEFAULT NULL;`

**4. `src/hooks/useSalesCommissions.ts`** (novo hook)
- Busca vendas concluídas/entregues no período, agrupa por `created_by` (comercial)
- Calcula comissão: `total_value * (rate / 100)` onde `rate` = global ou individual
- Retorna por comercial: total vendas, total comissão, nº de vendas

**5. `src/components/dashboard/CommissionsWidget.tsx`** (novo widget)
- **Admin**: Tabela com todos os comerciais, vendas e comissões do período
- **Comercial**: Card resumo com as suas próprias comissões
- Filtro por período (usa o filtro global do dashboard)
- Cards: Total Vendas, Total Comissões, Média por Venda

**6. `src/pages/Dashboard.tsx`**
- Renderizar o widget de comissões quando `commissions_enabled = true`

### Fluxo de decisão da percentagem

```text
commissions_enabled = true?
    │ NÃO → Sem comissões
    │ SIM
    ▼
commission_percentage global > 0?
    │ SIM → Usa global para todos
    │ NÃO
    ▼
organization_members.commission_rate individual > 0?
    │ SIM → Usa individual
    │ NÃO → Comissão = 0
```

### Ficheiros
- `src/components/settings/SalesSettingsTab.tsx` — Switch + campo % global
- `src/components/settings/TeamTab.tsx` — Campo % individual por membro
- `src/hooks/useSalesCommissions.ts` — Cálculo de comissões por período
- `src/components/dashboard/CommissionsWidget.tsx` — Widget dashboard
- `src/pages/Dashboard.tsx` — Integração do widget
- Migration: nova coluna `commission_rate` em `organization_members`

