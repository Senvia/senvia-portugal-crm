

## Plano: Mover lead para etapa "Agendado" ao agendar recontacto

### Problema
Quando agendas um recontacto, o lead fica na etapa atual em vez de mover para a etapa "Agendado" da pipeline.

### Solução
No `handleLostConfirm` (linha 344 de `Leads.tsx`), quando há `followUpDate`, encontrar dinamicamente a etapa "agendado/scheduled" da pipeline e mover o lead para lá.

### Alteração

| Ficheiro | Ação |
|---|---|
| `src/pages/Leads.tsx` | Na condição `if (!data.followUpDate)` (linha 344), adicionar um `else` que encontra a etapa "scheduled" usando a função `isScheduledStage` já existente e faz `updateStatus.mutate` para essa etapa |

A lógica será:
```typescript
if (!data.followUpDate) {
  updateStatus.mutate({ leadId, status: lostStatus });
} else {
  // Find the "scheduled" stage dynamically
  const scheduledStage = stages.find(s => isScheduledStage(s.key));
  if (scheduledStage) {
    updateStatus.mutate({ leadId, status: scheduledStage.key });
  }
}
```

Isto usa a função `isScheduledStage` (linha 157) que já deteta etapas com keywords como "agendado", "scheduled", "reunião", garantindo compatibilidade com qualquer pipeline customizada.

