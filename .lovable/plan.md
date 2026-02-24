

# Remover "Lembrete Padrao" e aplicar lembretes a todos os tipos de evento

## Problema

1. O card "Lembrete Padrao" e redundante -- os lembretes de "Reunioes e Chamadas" devem servir para **todos** os tipos de evento (nao so reunioes/chamadas).
2. E preciso evitar duplicidade: os lembretes automaticos das definicoes so devem ser aplicados quando o evento **nao tem** lembrete configurado manualmente.

## Solucao

### O que muda

1. **Remover** o card "Lembrete Padrao" da UI e do modelo de dados
2. **Renomear** o card para algo mais generico (ex: "Lembretes Automaticos") -- ja que agora se aplica a todos os eventos
3. **Aplicar** os lembretes automaticos (horas/dias) a **todos os tipos de evento**, nao apenas reunioes e chamadas
4. **Condicao**: so aplicar se o utilizador **nao** definiu um lembrete manualmente no evento

### Logica no CreateEventModal

```text
Se o utilizador definiu reminder_minutes manualmente -> usar esse valor
Senao, se auto_reminder_meetings esta ativo -> calcular a partir de auto_reminder_hours / auto_reminder_days
Senao -> null (sem lembrete)
```

A unica diferenca e que agora remove-se o filtro `eventType === 'meeting' || eventType === 'call'`. Aplica-se a qualquer tipo.

## Secao tecnica

### Ficheiros alterados

1. **`src/components/settings/CalendarAlertsSettings.tsx`**
   - Remover todo o card "Lembrete Padrao" (linhas 124-160)
   - Remover `default_reminder_minutes` da interface e do DEFAULT_SETTINGS
   - Renomear titulo do card de "Reunioes e Chamadas" para "Lembretes Automaticos"
   - Atualizar descricao para: "Aplique automaticamente um lembrete a eventos que nao tenham lembrete configurado manualmente."

2. **`src/components/calendar/CreateEventModal.tsx`**
   - Remover a logica que aplica `default_reminder_minutes` ao abrir o modal (linhas 128-132)
   - No handleSubmit, remover o filtro de tipo de evento: em vez de `eventType === 'meeting' || eventType === 'call'`, aplicar a todos os tipos
   - A condicao `reminderMinutes` (definido manualmente) continua a ter prioridade

3. **`src/types/calendar.ts`**
   - Sem alteracoes

### Sem migracao de BD necessaria

O campo `calendar_alert_settings` e JSONB. O campo `default_reminder_minutes` simplesmente deixa de ser lido/gravado, sem impacto.

