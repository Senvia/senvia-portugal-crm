

## Diagnóstico: Lead Virgolino não muda de estado

### Causa raiz identificada

A organização "Escolha Inteligente" é do nicho **telecom**. Isso causa dois problemas encadeados:

1. **`isTelecom = true`** → o botão "Marcar como Perdido" fica **escondido** no diálogo. O utilizador só pode clicar em "Agendar Recontacto" (que obriga a preencher data).

2. **Quando agenda recontacto**, o código procura uma etapa "Agendado" na pipeline:
   ```typescript
   const scheduledStage = stages?.find(s => isScheduledStage(s.key));
   if (scheduledStage) {
     updateStatus.mutate(...);
   }
   ```
   Mas a pipeline desta organização **não tem nenhuma etapa com nome "Agendado"** (as etapas são: Lead, QUALIFICADO, NA, NA 2, na 3, CONVERTIDO, Perdido). O `scheduledStage` é `undefined`, o `if` falha silenciosamente, e **o status nunca é atualizado**. As notas são gravadas, o evento de calendário é criado, mas a lead fica parada em "na 3".

### Correção proposta

**Ficheiro: `src/pages/Leads.tsx`** — na função `handleLostConfirm` (linhas 357-365):

Adicionar fallback: quando há follow-up agendado mas não existe etapa "Agendado" na pipeline, **mover a lead para "Perdido"** (o estado final negativo original) em vez de não fazer nada.

```typescript
if (!data.followUpDate) {
  updateStatus.mutate({ leadId, status: pendingLostStatus.status });
} else {
  const scheduledStage = stages?.find(s => isScheduledStage(s.key));
  if (scheduledStage) {
    updateStatus.mutate({ leadId, status: scheduledStage.key });
  } else {
    // Fallback: no scheduled stage exists, mark as lost anyway
    updateStatus.mutate({ leadId, status: pendingLostStatus.status });
  }
}
```

Isto garante que, independentemente da configuração da pipeline, a lead sempre muda de estado quando o utilizador confirma no diálogo.

