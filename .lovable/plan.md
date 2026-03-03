

## Enviar Email de Reunião ao Agendar Lead

### Situação atual

Atualmente, quando uma lead é movida para "Agendada" e o evento é criado no `CreateEventModal`, **não existe nenhum envio de email automático**. Também não existe um campo `meeting_link` na tabela `calendar_events` para guardar o link da reunião (O365/Teams/Zoom/etc).

O sistema já tem infraestrutura de envio de emails via Brevo (`send-template-email` edge function + `useSendTemplateEmail` hook), usada para propostas e campanhas.

### Plano

#### 1. Migração DB: Adicionar campo `meeting_link` à tabela `calendar_events`
- `ALTER TABLE calendar_events ADD COLUMN meeting_link text;`

#### 2. Atualizar tipo `CalendarEvent` em `src/types/calendar.ts`
- Adicionar `meeting_link?: string | null`

#### 3. Atualizar `CreateEventModal`
- Adicionar campo "Link da Reunião" (input URL) — visível quando `event_type` é `meeting` ou `call`
- Adicionar toggle/checkbox "Enviar email ao lead" (visível apenas quando há lead associado com email)
- No `handleSubmit`: guardar `meeting_link` no evento e, se o toggle estiver ativo, chamar `send-template-email` com um email HTML inline contendo:
  - Nome do lead
  - Data/hora da reunião
  - Link da reunião (botão clicável)
  - Nome da organização

#### 4. Atualizar `useCreateEvent` e `useUpdateEvent`
- Passar `meeting_link` nos parâmetros de criação/edição

### Dependências
- A organização precisa ter Brevo configurado (`brevo_api_key` + `brevo_sender_email`) para o envio funcionar
- O lead precisa ter email preenchido

### Resultado
Ao criar um evento "Reunião" com lead associado, o utilizador pode colar o link O365/Teams e enviar automaticamente um email profissional ao lead com todos os detalhes da reunião.

Alteração em ~4 ficheiros + 1 migração DB.

