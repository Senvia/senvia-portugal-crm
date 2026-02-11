

## Lista de Eventos do Dia Selecionado (abaixo do calendario)

### Objetivo
Adicionar uma lista de eventos abaixo do calendario (em todas as vistas: mes, semana, dia) que mostra os eventos agendados para o dia selecionado. O clique nos eventos do calendario deixa de abrir detalhes diretamente -- em vez disso, seleciona o dia. O utilizador clica no evento na lista abaixo para ver os detalhes.

### Comportamento esperado
1. Ao clicar num dia no calendario (mes/semana), esse dia fica "selecionado" (highlight) e a lista abaixo atualiza com os eventos desse dia
2. Ao clicar num evento compacto dentro do calendario, tambem seleciona o dia (nao abre detalhes)
3. A lista abaixo usa o componente `EventCard` (versao expandida, nao compacta) para cada evento
4. Clicar num `EventCard` na lista abre o `EventDetailsModal`
5. Se nao houver eventos no dia, mostrar mensagem "Sem eventos agendados"
6. Por defeito, o dia selecionado e "hoje"

### Alteracoes

**1. `src/components/calendar/CalendarView.tsx`**

- Adicionar state `selectedDayForList` (Date) -- inicializado com `new Date()`
- Mudar `handleDayClick`: em vez de abrir o `CreateEventModal`, passa a definir `selectedDayForList` para o dia clicado
- Mudar `handleEventClick` no contexto do calendario (mes/semana): em vez de abrir detalhes, seleciona o dia do evento
- Adicionar um botao "+" flutuante ou no header da lista para criar evento no dia selecionado
- Filtrar os eventos do dia selecionado: `selectedDayEvents = events.filter(e => isSameDay(...))`
- Renderizar abaixo do calendario:
  - Header com data selecionada + botao criar evento
  - Lista de `EventCard` (nao compactos)
  - Se vazio: mensagem "Sem eventos para este dia"
- O clique no `EventCard` da lista abre `EventDetailsModal`

**2. `src/components/calendar/MonthView.tsx`**

- Receber nova prop `selectedDay?: Date` para highlight visual do dia selecionado
- O clique no evento compacto (`EventCard compact`) passa a chamar `onDayClick(day)` em vez de `onEventClick`
- Aplicar estilo de selecao (ex: `ring-2 ring-primary`) ao dia selecionado

**3. `src/components/calendar/WeekView.tsx`**

- Mesma logica: receber `selectedDay`, highlight, e redirecionar clique de eventos para `onDayClick`

**4. Novo componente: `src/components/calendar/DayEventsList.tsx`**

- Props: `selectedDate`, `events` (ja filtrados), `onEventClick`, `onCreateEvent`
- Renderiza:
  - Header: "Eventos de {data formatada}" + botao "Novo Evento"
  - Lista de `EventCard` (expandidos) clicaveis
  - Estado vazio com icone e texto

### Secao Tecnica

**CalendarView - novo fluxo:**
```tsx
const [selectedDayForList, setSelectedDayForList] = useState<Date>(new Date());

const selectedDayEvents = useMemo(() => {
  return events.filter(e => isSameDay(new Date(e.start_time), selectedDayForList));
}, [events, selectedDayForList]);

const handleDayClick = (date: Date) => {
  setSelectedDayForList(date);
};

// Abaixo do calendario:
<DayEventsList
  selectedDate={selectedDayForList}
  events={selectedDayEvents}
  onEventClick={handleEventClick}  // este abre detalhes
  onCreateEvent={() => {
    setSelectedDate(selectedDayForList);
    setSelectedEvent(null);
    setCreateModalOpen(true);
  }}
/>
```

**MonthView - highlight + redirect:**
```tsx
// Nova prop
selectedDay?: Date;

// No dia cell:
className={cn(
  ...,
  selectedDay && isSameDay(day, selectedDay) && 'ring-2 ring-primary ring-inset'
)}

// EventCard compact click -> seleciona dia em vez de abrir detalhes
onClick={(e) => {
  e.stopPropagation();
  onDayClick(day);  // seleciona o dia
}}
```

**DayEventsList component:**
```tsx
// Header com data + botao
// Lista de EventCard (expandido)
// Empty state
```

### Ficheiros a criar/editar
- **Criar**: `src/components/calendar/DayEventsList.tsx`
- **Editar**: `src/components/calendar/CalendarView.tsx`
- **Editar**: `src/components/calendar/MonthView.tsx`
- **Editar**: `src/components/calendar/WeekView.tsx`

