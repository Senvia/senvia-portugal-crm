

# Separar Lembretes de Reunioes/Chamadas em Horas e Dias

## Problema

Atualmente, o lembrete automatico para Reunioes e Chamadas tem apenas **um** select com opcoes misturadas (15min, 30min, 1h, 1 dia). O utilizador quer poder configurar **dois lembretes separados**:

1. **Lembrete por horas** -- ex: "2 horas antes", "1 hora antes", ou "Nunca"
2. **Lembrete por dias** -- ex: "1 dia antes", "2 dias antes", ou "Nunca"

Ambos podem estar ativos ao mesmo tempo (ex: lembrar 1 dia antes E 2 horas antes).

## Solucao

### Estrutura do Card "Reunioes e Chamadas"

```text
Reunioes e Chamadas
  |-- Switch: Lembrete automatico (ativar/desativar)
  |
  |-- (se ativo):
  |     |-- Lembrar horas antes: [Nunca | 1h | 2h | 3h | 4h | 6h | 12h]
  |     |-- Lembrar dias antes:  [Nunca | 1 dia | 2 dias | 3 dias | 7 dias]
```

### Dados guardados (JSONB)

O campo `auto_reminder_minutes` atual (numero unico) sera substituido por dois campos:

```text
{
  "default_reminder_minutes": 60,
  "auto_reminder_meetings": true,
  "auto_reminder_hours": 2,        (horas antes, null = Nunca)
  "auto_reminder_days": 1           (dias antes, null = Nunca)
}
```

O campo antigo `auto_reminder_minutes` deixa de ser usado, mantendo retrocompatibilidade (se existir, e convertido para os novos campos na leitura).

## Secao Tecnica

### Ficheiros alterados

1. **`src/components/settings/CalendarAlertsSettings.tsx`**
   - Alterar a interface `CalendarAlertSettings` para ter `auto_reminder_hours: number | null` e `auto_reminder_days: number | null` em vez de `auto_reminder_minutes: number`
   - Adicionar logica de migracao na leitura: se existir `auto_reminder_minutes` antigo, converter (ex: 60 -> hours=1, 1440 -> days=1)
   - Substituir o select unico por dois selects: "Lembrar horas antes" e "Lembrar dias antes"
   - Criar opcoes de horas: Nunca, 1h, 2h, 3h, 4h, 6h, 12h
   - Criar opcoes de dias: Nunca, 1 dia, 2 dias, 3 dias, 7 dias

2. **`src/components/calendar/CreateEventModal.tsx`**
   - Adaptar a logica que aplica lembrete automatico para usar os novos campos
   - Quando `auto_reminder_meetings` esta ativo, aplicar o menor dos dois valores (horas/dias) como `reminder_minutes` do evento
   - Ex: se hours=2 e days=1, aplica 120 minutos (2h) como lembrete principal

3. **`src/types/calendar.ts`**
   - Sem alteracoes necessarias (REMINDER_OPTIONS continua a ser usado no "Lembrete Padrao")

### Sem migracao de BD necessaria

O campo `calendar_alert_settings` ja e JSONB, por isso os novos campos sao simplesmente adicionados ao objeto JSON existente. A retrocompatibilidade e tratada no codigo (leitura do valor antigo e conversao).

