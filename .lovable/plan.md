

# Adicionar Alertas de Calendario nas Definicoes de Notificacoes

## Problema

Atualmente, em Definicoes > Notificacoes > Alertas, so existem os "Alertas de Fidelizacao" (exclusivos para telecom). O utilizador precisa de configurar lembretes automaticos para eventos do calendario (reunioes, chamadas, follow-ups), como lembrete de 1 dia antes ou 1 hora antes, e essa opcao nao existe nas definicoes.

## Solucao

Separar a secao "Alertas" em duas sub-secoes e criar um novo componente de configuracao de alertas de calendario, disponivel para **todos os nichos**.

### Configuracoes disponiveis no novo componente

1. **Lembrete padrao para novos eventos** -- Selecionar o valor de `reminder_minutes` que sera pre-selecionado ao criar um novo evento (ex: "1 hora antes", "1 dia antes", "Sem lembrete")
2. **Notificacao push para lembretes** -- Switch para ativar/desativar push notifications em lembretes do calendario (ja funciona via `check-reminders` cron)
3. **Lembrete automatico para reunioes** -- Switch que garante que eventos do tipo `meeting` e `call` recebem automaticamente um lembrete mesmo que o utilizador se esqueca de configurar

### Armazenamento

Os valores serao guardados numa nova coluna JSONB `calendar_alert_settings` na tabela `organizations`:

```text
{
  "default_reminder_minutes": 60,
  "auto_reminder_meetings": true,
  "auto_reminder_minutes": 60
}
```

## Alteracoes

### 1. Migracao de base de dados

Adicionar coluna `calendar_alert_settings` (JSONB, default `{}`) na tabela `organizations`.

### 2. Novo componente: `CalendarAlertsSettings.tsx`

Componente com o mesmo estilo do `FidelizationAlertsSettings`:
- Card "Lembrete Padrao": Select com opcoes de REMINDER_OPTIONS (15min, 30min, 1h, 1 dia)
- Card "Reunioes e Chamadas": Switch para ativar lembrete automatico + select para escolher quanto tempo antes
- Botao "Guardar Definicoes"
- Le e grava em `organizations.calendar_alert_settings`

### 3. MobileSettingsNav.tsx -- Nova sub-secao

Adicionar `"notif-calendar"` como nova sub-secao dentro de `notifications`:
- Label: "Calendario"
- Icone: Calendar
- Descricao: "Lembretes de eventos e reunioes"
- Visivel para **todos os nichos** (sem filtro isTelecom)

Renomear a sub-secao `notif-alerts` para "Fidelizacao" (mais claro).

### 4. Settings.tsx -- Renderizar novo componente

Adicionar case `"notif-calendar"` no `renderSubContent` que renderiza `<CalendarAlertsSettings />`.

### 5. CreateEventModal.tsx -- Usar valor padrao

Ao criar um novo evento, ler `organization.calendar_alert_settings.default_reminder_minutes` e pre-selecionar esse valor no select de lembrete (em vez de vazio).

Para eventos tipo `meeting` ou `call`, se `auto_reminder_meetings` estiver ativo e o utilizador nao configurar lembrete manualmente, aplicar automaticamente o valor de `auto_reminder_minutes`.

## Secao Tecnica

### Ficheiros criados
1. `src/components/settings/CalendarAlertsSettings.tsx` -- Novo componente de configuracao

### Ficheiros alterados
1. **Migracao SQL** -- Adicionar coluna `calendar_alert_settings` JSONB na tabela `organizations`
2. `src/components/settings/MobileSettingsNav.tsx` -- Adicionar tipo `"notif-calendar"` e sub-secao
3. `src/pages/Settings.tsx` -- Importar e renderizar `CalendarAlertsSettings`
4. `src/components/calendar/CreateEventModal.tsx` -- Ler definicoes da org para pre-preencher lembrete padrao

### Fluxo de dados

```text
Definicoes > Notificacoes > Calendario
         |
         v
organizations.calendar_alert_settings (JSONB)
         |
         v
CreateEventModal le o default_reminder_minutes
         |
         v
Evento criado com reminder_minutes pre-preenchido
         |
         v
check-reminders (cron) envia push notification
```
