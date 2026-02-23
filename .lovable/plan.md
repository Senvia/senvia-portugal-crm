

# Destinatarios de Automacao = Listas de Transmissao

## Objetivo
Alterar o sistema de automacoes para que os destinatarios sejam as **listas de contactos** (listas de transmissao) em vez de destinatarios individuais (lead/cliente/utilizador).

## O que muda

### 1. Base de dados: nova coluna `list_id` na tabela `email_automations`
- Adicionar coluna `list_id uuid REFERENCES client_lists(id) ON DELETE SET NULL` a tabela `email_automations`.
- A coluna `recipient_type` deixa de ser usada (pode ficar para retrocompatibilidade, mas sera ignorada).

### 2. Frontend: Modal de criacao (`CreateAutomationModal.tsx`)
- Remover o campo "Destinatario" com opcoes lead/cliente/utilizador.
- Substituir por um campo **"Lista de Destinatarios"** que lista as listas de transmissao da organizacao (usando `useContactLists`).
- Usar `SearchableCombobox` para permitir pesquisa.
- Guardar o `list_id` na automacao.

### 3. Frontend: Hook `useAutomations.ts`
- Remover `RECIPIENT_TYPES`.
- Adicionar `list_id` ao tipo `EmailAutomation` e ao `createAutomation`.
- Remover `recipient_type` do fluxo de criacao.

### 4. Frontend: Tabela de automacoes (`AutomationsTable.tsx`)
- Mostrar o nome da lista em vez do tipo de destinatario (opcional, pode ser adicionado numa coluna ou no detalhe).

### 5. Backend: Edge Function `process-automation/index.ts`
- Em vez de resolver um unico destinatario do `record`, buscar todos os membros da lista associada (`list_id`):
  1. Consultar `marketing_list_members` WHERE `list_id = automation.list_id`
  2. JOIN com `marketing_contacts` para obter `email` e `name`
  3. Filtrar apenas contactos com `subscribed = true`
  4. Enviar (ou agendar) o email para cada membro da lista

### 6. Backend: Edge Function `process-automation-queue/index.ts`
- Sem alteracoes significativas -- os items na queue ja tem `recipient_email` individual, so muda quem os cria.

## Detalhe Tecnico

### Migracao SQL
```sql
ALTER TABLE email_automations ADD COLUMN list_id uuid REFERENCES client_lists(id) ON DELETE SET NULL;
```

### Fluxo no Edge Function (process-automation)
```text
Trigger disparado
  -> Encontra automacoes ativas para este trigger
  -> Para cada automacao:
     -> Busca membros da lista (list_id)
     -> Para cada membro com email valido e subscribed=true:
        -> Se delay > 0: insere na automation_queue
        -> Se delay = 0: envia imediatamente via send-template-email
```

### Ficheiros alterados
- `supabase/migrations/xxx.sql` -- nova coluna `list_id`
- `src/hooks/useAutomations.ts` -- adicionar `list_id`, remover `RECIPIENT_TYPES`
- `src/components/marketing/CreateAutomationModal.tsx` -- substituir campo destinatario por seletor de lista
- `supabase/functions/process-automation/index.ts` -- resolver destinatarios a partir da lista

