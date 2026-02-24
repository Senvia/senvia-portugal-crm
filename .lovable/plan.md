

# Bloquear alteracao de estado em Leads finais (Ganho/Perdido) para nao-administradores

## Objetivo

Leads que estejam num estado final (is_final_positive ou is_final_negative) nao podem ter o seu estado alterado, exceto por utilizadores com role de administrador ou super_admin.

## Logica

Utilizar o hook `useFinalStages()` (ja existe em `usePipelineStages.ts`) para verificar se o estado atual da lead e final, e o `usePermissions()` para verificar se o utilizador e admin.

## Alteracoes

### 1. Leads.tsx -- handleStatusChange (linhas 174-272)

No inicio da funcao `handleStatusChange`, adicionar verificacao:
- Encontrar a lead pelo ID
- Verificar se o status atual da lead corresponde a uma etapa final (is_final_positive ou is_final_negative)
- Se for final e o utilizador NAO for admin, mostrar toast de erro e retornar sem fazer nada

Importar `useFinalStages` e utilizar `isFinalStatus()`.

### 2. LeadCard.tsx -- Menu dropdown de "Mover para" (linhas 131-148)

- Receber uma nova prop `isLocked` (boolean) que indica se a lead esta num estado final e o utilizador nao e admin
- Se `isLocked === true`, nao renderizar as opcoes de "Mover para [etapa]" no dropdown menu
- Manter a opcao "Ver detalhes" e "Eliminar" (se admin)

### 3. KanbanBoard.tsx -- Drag & drop (linhas 64-85)

- Impedir o drag de leads que estao em etapas finais quando o utilizador nao e admin
- Na funcao `handleDragStart`, verificar se a lead esta numa etapa final; se sim e nao for admin, cancelar o drag
- Alternativamente, passar prop ao LeadCard para desativar o drag handle visual

### 4. KanbanTabs.tsx (mobile) -- Mesma logica

- Aplicar a mesma restricao que o KanbanBoard para a versao mobile

### 5. LeadDetailsModal.tsx -- Select de estado

- Se a lead esta num estado final e o utilizador nao e admin, desativar o Select de alteracao de estado (disabled)
- Mostrar tooltip ou texto explicativo: "Apenas administradores podem alterar o estado de leads finalizadas"

### 6. LeadsTableView.tsx -- Se houver controlo de status inline

- Aplicar a mesma logica de bloqueio

## Ficheiros Alterados

1. `src/pages/Leads.tsx` -- Guardar central no handleStatusChange + importar hooks
2. `src/components/leads/LeadCard.tsx` -- Prop isLocked para esconder opcoes de mover
3. `src/components/leads/KanbanBoard.tsx` -- Bloquear drag de leads finais
4. `src/components/leads/KanbanTabs.tsx` -- Mesma logica para mobile
5. `src/components/leads/LeadDetailsModal.tsx` -- Desativar Select de estado
6. `src/components/leads/LeadsTableView.tsx` -- Desativar controlo de estado

## Resultado

- Leads em estados finais (Ganho/Perdido) ficam "bloqueadas" visualmente e funcionalmente
- Apenas administradores e super_admins podem mover estas leads para outro estado
- A experiencia e consistente entre desktop (Kanban drag + dropdown) e mobile (tabs + dropdown)
