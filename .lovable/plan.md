

# Corrigir Criacao de Agendamento ao Marcar Lead como Perdido

## Problema Identificado
Ao analisar o codigo em detalhe, o fluxo de criacao de evento quando um lead e marcado como "Perdido" esta a depender de uma condicao desnecessaria (`data.scheduleFollowUp && data.followUpDate`) em `Leads.tsx` linha 282. Embora o `LostLeadDialog` envie sempre `scheduleFollowUp: true`, esta condicao pode falhar em cenarios edge-case. Alem disso, o hook `useCreateEvent` atualiza o status do lead para `scheduled` apos criar o evento, o que conflita com o status `lost` ja definido -- podendo causar erros silenciosos.

## Solucao

### 1. `src/pages/Leads.tsx` - Simplificar condicao e corrigir conflito de status

**Remover a condicao `data.scheduleFollowUp`** -- como o agendamento e agora obrigatorio, basta verificar se `followUpDate` existe (o que ja e garantido pela validacao do dialog).

**Criar o evento SEM `lead_id`** no `createEvent.mutate` para evitar que o hook altere o status do lead para `scheduled`. Em vez disso, inserir o evento diretamente com o Supabase client para ter controlo total:

```typescript
// Substituir createEvent.mutate por insercao direta
const followUpDate = new Date(`${data.followUpDate}T${data.followUpTime}:00`);

// Inserir evento diretamente (sem alterar status do lead)
supabase
  .from('calendar_events')
  .insert({
    title: `Recontacto: ${pendingLead.name}`,
    description: `Follow-up de lead perdido (${reasonLabel}). ${data.notes || ""}`.trim(),
    event_type: data.eventType,
    start_time: followUpDate.toISOString(),
    lead_id: pendingLead.id,
    user_id: user.id,
    organization_id: organization.id,
  })
  .select()
  .single()
  .then(({ error }) => {
    if (error) {
      toast.error('Erro ao criar agendamento de recontacto');
      console.error('Error creating follow-up event:', error);
    } else {
      toast.success('Recontacto agendado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['lead-events'] });
    }
  });
```

### 2. `src/pages/Leads.tsx` - Importacoes necessarias

- Importar `supabase` de `@/integrations/supabase/client`
- Importar `useQueryClient` de `@tanstack/react-query`
- Importar `toast` de `sonner`

### 3. Remover dependencia do `useCreateEvent` para este fluxo

O `useCreateEvent` continua a ser usado para criar eventos normais (quando o lead vai para "Agendado"). Apenas para o fluxo de "Perdido", usamos insercao direta para evitar o conflito de status.

## Resumo
- 1 ficheiro alterado (`src/pages/Leads.tsx`)
- 0 alteracoes de base de dados
- O evento de recontacto e criado diretamente, sem passar pelo hook que altera o status do lead
- O lead mantem-se como "Perdido" sem conflito
- Toast de sucesso/erro para feedback visual ao utilizador
