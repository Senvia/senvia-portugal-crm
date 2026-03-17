
Objetivo

Fazer com que o widget “Próximos Eventos” no painel mostre apenas eventos dos colaboradores associados ao utilizador, sem alterar a Agenda.

O que confirmei no código

- O widget está em `src/components/dashboard/CalendarAlertsWidget.tsx`.
- Ele usa `useCalendarEvents(today, endRange)`.
- O hook `useCalendarEvents` filtra apenas por `effectiveUserId` (`src/hooks/useCalendarEvents.ts`), não por lista de membros.
- Em `useTeamFilter`:
  - líder de equipa sem colaborador selecionado → `effectiveUserIds = [eu + equipa]`
  - mas `effectiveUserId = null`
- Resultado atual: no painel, quando o líder não escolhe um colaborador específico, o query do calendário não filtra por utilizador e acaba por trazer eventos da organização inteira.

Abordagem

1. Corrigir só o widget do painel
- Em `CalendarAlertsWidget`, usar também `useTeamFilter()`.
- Aplicar filtro local sobre os eventos carregados:
  - se existir `effectiveUserIds`, manter apenas eventos cujo `user_id` pertença a essa lista
  - se não existir, manter comportamento atual

2. Recalcular tudo com base na lista filtrada
- `todayEvents`
- `upcomingEvents`
- total do badge
- preview do card
- lista completa no modal

3. Não mexer na Agenda
- Como pediu “Só no painel”, `src/components/calendar/CalendarView.tsx` e `useCalendarEvents.ts` ficam inalterados.

Porque esta abordagem é a melhor aqui

- É a correção mínima e segura.
- Resolve exatamente o bug do painel para líderes/equipas.
- Não arrisca alterar o comportamento da Agenda nem outros módulos que já dependem de `useCalendarEvents`.

Ficheiro a ajustar

- `src/components/dashboard/CalendarAlertsWidget.tsx`

Resultado esperado

- Utilizador com escopo `own` → vê só os próprios eventos
- Líder com equipa associada → vê apenas eventos dele + colaboradores da sua equipa
- Admin sem filtro selecionado → continua a poder ver todos
- Admin com colaborador selecionado → continua a ver só esse colaborador

Validação após implementação

- Entrar com utilizador líder de equipa
- Confirmar que “Próximos Eventos” deixa de mostrar eventos de pessoas fora da equipa
- Confirmar que o número no card e a lista no modal batem certo
- Confirmar que a Agenda continua igual, sem mudanças
