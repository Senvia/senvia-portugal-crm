

## Atualização em cascata ao atribuir colaborador a clientes

### Contexto

Quando se atribui um colaborador a clientes (bulk ou individual), apenas a tabela `crm_clients` é atualizada. As propostas, leads e eventos de calendário associados mantêm o colaborador anterior, causando inconsistência.

### Alteração

**`src/hooks/useBulkAssign.ts`** — na função `useBulkAssignClients`:

Após atualizar `crm_clients.assigned_to`, executar 3 operações adicionais em cascata:

1. **Leads associados**: Buscar os `lead_id` dos clientes selecionados e atualizar `leads.assigned_to` para o novo colaborador
2. **Propostas associadas**: Atualizar `proposals.created_by` onde `client_id` está nos clientes selecionados
3. **Eventos de calendário**: Atualizar `calendar_events.user_id` onde `client_id` está nos clientes selecionados

Invalidar as queries `["leads"]`, `["proposals"]`, `["calendar-events"]` além de `["clients"]` no `onSuccess`.

### Lógica detalhada

```text
mutationFn:
  1. UPDATE crm_clients SET assigned_to = X WHERE id IN (...)
  2. SELECT lead_id FROM crm_clients WHERE id IN (...) AND lead_id IS NOT NULL
  3. UPDATE leads SET assigned_to = X WHERE id IN (lead_ids)
  4. UPDATE proposals SET created_by = X WHERE client_id IN (client_ids)
  5. UPDATE calendar_events SET user_id = X WHERE client_id IN (client_ids)
```

### Ficheiro
- `src/hooks/useBulkAssign.ts`

