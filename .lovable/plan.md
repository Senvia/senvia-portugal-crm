
Objetivo: mostrar em cada evento da Agenda o comercial que agendou esse evento/reunião, sem alterar a lógica de criação existente.

O que já existe
- A estrutura do evento já suporta isso:
  - `calendar_events.user_id` guarda quem criou/agendou.
  - `CalendarEvent` já tem campo opcional `user?: { id, full_name }`.
- O hook `useCalendarEvents` já tenta enriquecer cada evento com o `full_name` do utilizador a partir de `profiles`.

Problema atual
- O nome do comercial já vem no payload final do frontend, mas a UI da Agenda não o mostra em lado nenhum.
- Em `WeekView` e parte do `MonthView`, há também um pequeno bug de interação: alguns botões chamam só `onDayClick(day)` em vez de abrir o evento, por isso o detalhe do evento pode não aparecer ao clicar diretamente.

Plano de implementação
1. Confirmar e reforçar o carregamento do comercial no hook
- Rever `useCalendarEvents` para garantir que o `user.full_name` fica sempre preenchido quando existir `user_id`.
- Se necessário, otimizar a busca dos perfis para evitar um pedido por evento e passar a resolver os nomes em batch.

2. Mostrar o comercial nos cartões e vistas da Agenda
- Atualizar `EventCard` para exibir uma linha adicional com algo como:
  - `Comercial: Nome do utilizador`
- Mostrar isso tanto na versão normal como, se couber bem, numa forma compacta/resumida na vista mensal.

3. Mostrar o comercial no detalhe do evento
- Em `EventDetailsModal`, adicionar um bloco informativo:
  - `Comercial`
  - nome do utilizador que agendou o evento
- Isto garante que mesmo em layouts compactos o utilizador consegue sempre ver quem marcou a reunião.

4. Corrigir o clique nos eventos onde necessário
- Em `MonthView` e `WeekView`, ajustar os handlers para que clicar no evento abra o detalhe (`onEventClick(event)`) em vez de apenas selecionar o dia.
- Assim o utilizador vê logo o comercial do evento sem passos extra.

5. Padronizar fallback
- Se por algum motivo o nome do comercial não existir, mostrar fallback seguro:
  - `Comercial não identificado`
  - ou simplesmente ocultar o campo, conforme o padrão visual já usado no projeto.

Resultado esperado
- Cada reunião/evento na Agenda passa a mostrar claramente quem foi o comercial que a agendou.
- A informação aparece no cartão e no modal de detalhes.
- O clique nos eventos fica mais consistente nas várias vistas da Agenda.

Detalhes técnicos
- Ficheiros mais prováveis:
  - `src/hooks/useCalendarEvents.ts`
  - `src/components/calendar/EventCard.tsx`
  - `src/components/calendar/EventDetailsModal.tsx`
  - `src/components/calendar/MonthView.tsx`
  - `src/components/calendar/WeekView.tsx`
- Não deve exigir alteração de base de dados, porque `user_id` já existe em `calendar_events` e o tipo `CalendarEvent.user` já está preparado.

<lov-actions>
<lov-suggestion message="Testa a Agenda de ponta a ponta clicando em eventos nas vistas mês, semana e dia para confirmar que o comercial aparece corretamente.">Verificar que funciona</lov-suggestion>
<lov-suggestion message="Adicionar avatar ou iniciais do comercial em cada evento da Agenda para identificação visual mais rápida.">Adicionar avatar do comercial</lov-suggestion>
<lov-suggestion message="Mostrar também o comercial nas notificações e lembretes de eventos para ficar consistente com a Agenda.">Levar comercial para lembretes</lov-suggestion>
</lov-actions>
