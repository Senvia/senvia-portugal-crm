

## Tabela de Performance da Equipa no Dashboard

### O que será criado

Uma tabela full-width no dashboard (semelhante ao painel de Performance de Vendas do telecom) com as colunas:

| Colaborador | Leads | Propostas | Valor Propostas Abertas | Vendas Concluídas | Comissão | Taxa Conversão |

A tabela respeita o `data_scope` do utilizador (own/team/all), o filtro de período do dashboard, e o filtro de membro de equipa.

### Alterações

**1. `src/lib/dashboard-templates.ts`**
- Adicionar `'team_performance_table'` ao tipo `WidgetType`
- Adicionar definição em `WIDGET_DEFINITIONS` com `chartType: 'none'`, icon `Users`, `description: 'Tabela de performance da equipa'`
- Não requer módulo específico (usa leads + proposals + sales)

**2. `src/components/dashboard/TeamPerformanceTable.tsx`** (novo)
- Componente Card com tabela que agrega dados por membro:
  - **Leads**: count de leads no período (da tabela `leads`)
  - **Propostas**: count de proposals no período
  - **Valor Propostas Abertas**: sum de `total_value` das proposals com status `pending`/`sent`
  - **Vendas Concluídas**: count de sales com status `delivered`/`completed`
  - **Comissão**: sum de `comissao` das vendas concluídas
  - **Taxa Conversão**: vendas concluídas / leads × 100
- Respeita `useTeamFilter` e `useDashboardPeriod` (igual ao SalesPerformancePanel)
- Linha de TOTAL no fim para admins com múltiplos membros
- Usa `PrintCardButton` para exportação

**3. `src/pages/Dashboard.tsx`**
- Importar `TeamPerformanceTable`
- Renderizar condicionalmente: visível se o widget `team_performance_table` está nos `visibleWidgets` OU nos `profileDashboardWidgets`
- Posicionado antes da grid de widgets pequenos, como painel full-width

**4. `src/hooks/useDashboardWidgets.ts`**
- Sem alterações necessárias — o novo widget type será automaticamente reconhecido pelo sistema existente

### Como ativar
Em **Definições > Perfis > Dashboard Personalizado**, o novo widget "Performance da Equipa" aparecerá automaticamente na lista de widgets disponíveis, podendo ser ativado/desativado por perfil.

