

# Auto-criar Cliente quando Lead e marcada como "Ganha"

## O que muda
Quando uma lead for arrastada para uma etapa final positiva (ex: "Ganho"), o sistema cria automaticamente um cliente com os dados da lead, sem necessidade de preencher formularios.

## Como funciona

1. O utilizador arrasta a lead para a coluna "Ganho" (ou qualquer etapa com `is_final_positive: true`)
2. O sistema verifica se ja existe um cliente associado a essa lead (`crm_clients.lead_id`)
3. Se **nao existe**: cria automaticamente o cliente usando `name`, `email`, `phone`, e `notes` da lead
4. Se **ja existe**: apenas atualiza o status da lead normalmente
5. Mostra toast de sucesso: "Lead ganha! Cliente criado automaticamente."
6. O status da lead e atualizado para a etapa final positiva

## Alteracoes tecnicas

### Ficheiro: `src/pages/Leads.tsx`

1. **Adicionar funcao `isWonStage`** (similar a `isLostStage`):
   - Verifica se a etapa tem `is_final_positive: true`
   - Fallback por keywords: `['ganho', 'won', 'fechado', 'closed']`

2. **Interceptar no `handleStatusChange`** (antes do fallback generico na linha 244):
   - Se `isWonStage(newStatus)` for true:
     - Verificar se ja existe cliente com `lead_id` correspondente
     - Se nao existir, chamar `useConvertLeadToClient` com dados da lead
     - Atualizar o status da lead para a etapa final positiva
     - Mostrar toast de confirmacao

3. **Importar** `useConvertLeadToClient` de `@/hooks/useClients`

### Logica da nova intercepcao (pseudo-codigo):

```text
if isWonStage(newStatus):
  existingClient = clients.find(c => c.lead_id === leadId)
  if NOT existingClient:
    convertLeadToClient({
      lead_id: leadId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes
    })
    toast("Lead ganha! Cliente criado automaticamente.")
  updateStatus(leadId, newStatus)
```

### Resultado
- 1 ficheiro alterado (`src/pages/Leads.tsx`)
- 0 alteracoes de base de dados
- Usa o hook `useConvertLeadToClient` que ja existe e herda o `assigned_to` da lead
- Nao bloqueia o fluxo -- o cliente e criado em background
- Se o cliente ja existir (lead convertida anteriormente), nao duplica

