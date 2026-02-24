
# Adicionar Widget de Alertas de Agenda no Dashboard

## Problema Atual

O Dashboard tem apenas o widget "Alertas de Fidelizacao" (exclusivo para nicho telecom). Nao existe nenhum widget que mostre eventos proximos do calendario (reunioes, chamadas, follow-ups, recontactos de leads perdidos). Isto significa que o utilizador nao tem visibilidade no Dashboard sobre compromissos agendados para os proximos dias.

## Solucao

Criar um novo widget **"Alertas de Agenda"** que aparece no Dashboard para **todos os nichos** e mostra:
- Eventos de **hoje** (urgente, destacado a vermelho/laranja)
- Eventos dos **proximos 7 dias** (informativo, destacado a azul)
- Cada evento mostra: titulo, tipo (icone), hora, lead associado (se houver)
- Clicar num evento navega para `/calendar`

## Alteracoes

### 1. Novo componente: `src/components/dashboard/CalendarAlertsWidget.tsx`

Widget com estrutura semelhante ao `FidelizationAlertsWidget`:
- Usa `useCalendarEvents` com range de hoje ate +7 dias
- Filtra apenas eventos com status `pending`
- Separa em duas secoes: "Hoje" e "Proximos 7 dias"
- Mostra icone do tipo de evento (reuniao, chamada, tarefa, follow-up)
- Mostra hora e lead associado
- Botao "Ver agenda" para navegar ao calendario
- Card com icone Calendar e titulo "Proximos Eventos"

### 2. Dashboard.tsx -- Adicionar o widget

- Importar `CalendarAlertsWidget`
- Renderizar junto ao `FidelizationAlertsWidget` (para telecom) ou sozinho (para outros nichos)
- O widget aparece para todos os nichos, desde que o modulo `calendar` esteja ativo
- Layout: grid de 2 colunas no desktop, 1 no mobile

### 3. Modulo calendar -- Verificar disponibilidade

O `enabled_modules` ja tem `calendar` como modulo. O widget so aparece se o modulo estiver ativo.

## Layout no Dashboard (apos alteracao)

```text
Para telecom (com clientes e calendario ativos):
[Alertas Fidelizacao] [Alertas Agenda]
[... widgets dinamicos ...]

Para outros nichos (com calendario ativo):
[Alertas Agenda]
[... widgets dinamicos ...]
```

## Secao Tecnica

### Ficheiros criados
1. **`src/components/dashboard/CalendarAlertsWidget.tsx`** -- Novo widget de alertas de agenda

### Ficheiros alterados
1. **`src/pages/Dashboard.tsx`** -- Adicionar CalendarAlertsWidget na area de alertas

### Dados utilizados
- Hook existente `useCalendarEvents(today, today+7days)` para buscar eventos pendentes
- Tipos e labels existentes em `src/types/calendar.ts` (EVENT_TYPE_LABELS, EVENT_TYPE_COLORS)
- Nenhuma alteracao de base de dados necessaria

### Comportamento do Widget
- Mostra badge com total de eventos pendentes
- Secao "Hoje" com fundo laranja/vermelho para eventos do dia
- Secao "Esta Semana" com fundo azul para eventos futuros
- Maximo de 3 eventos visiveis por secao, com botao "Ver todos"
- Estado vazio: "Sem eventos nos proximos 7 dias"
- Loading state com spinner
