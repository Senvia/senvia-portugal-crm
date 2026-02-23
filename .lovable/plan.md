

# Relatórios: Incluir Emails de Automações + Filtro por Fonte

## Problema Atual
Os emails enviados por automações são gravados na tabela `email_sends` mas sem qualquer referência à automação que os originou (campo `automation_id` não existe). O filtro de relatórios só permite selecionar campanhas, ignorando completamente os envios de automações.

## O que vai mudar

### 1. Base de dados: nova coluna `automation_id` na tabela `email_sends`
- Adicionar `automation_id uuid REFERENCES email_automations(id) ON DELETE SET NULL` para rastrear qual automação originou cada envio.

### 2. Backend: Edge Functions
- **`send-template-email`**: Aceitar o novo campo `automationId` no payload e gravá-lo no registo `email_sends`.
- **`process-automation`**: Passar o `automationId` ao invocar `send-template-email` para envios imediatos.
- **`process-automation-queue`**: Também passar o `automationId` (será necessário guardar na queue -- a queue já tem `automation_id`).

### 3. Frontend: Hook `useEmailStats`
- Aceitar um novo parâmetro de filtro: `source` (all / campaign / automation) e um `sourceId` (ID da campanha ou automação selecionada).
- Ajustar a query para filtrar por `campaign_id` ou `automation_id` conforme o tipo de fonte.
- Quando o filtro é "campaign", filtrar emails onde `campaign_id IS NOT NULL`.
- Quando o filtro é "automation", filtrar emails onde `automation_id IS NOT NULL`.

### 4. Frontend: Página de Relatórios (`Reports.tsx`)
- Substituir o Select de campanhas por dois selects encadeados:
  1. **Fonte**: "Todos" | "Campanhas" | "Automações"
  2. **Detalhe**: Ao selecionar "Campanhas" mostra a lista de campanhas; ao selecionar "Automações" mostra a lista de automações; "Todos" esconde o segundo select.
- Buscar a lista de automações usando `useAutomations`.
- Mostrar na tabela de eventos uma coluna "Origem" indicando se veio de campanha ou automação.

## Detalhe Tecnico

### Migracao SQL
```sql
ALTER TABLE public.email_sends 
ADD COLUMN automation_id uuid REFERENCES public.email_automations(id) ON DELETE SET NULL;
```

### Fluxo de dados atualizado
```text
process-automation
  -> send-template-email(automationId: automation.id)
     -> email_sends.insert({ automation_id: automationId })

process-automation-queue
  -> send-template-email(automationId: item.automation_id)
     -> email_sends.insert({ automation_id: automationId })
```

### Ficheiros alterados
- Nova migração SQL (coluna `automation_id`)
- `supabase/functions/send-template-email/index.ts` -- aceitar e gravar `automationId`
- `supabase/functions/process-automation/index.ts` -- passar `automationId` no body
- `supabase/functions/process-automation-queue/index.ts` -- passar `automationId` no body
- `src/hooks/useEmailStats.ts` -- novo filtro por fonte (campaign/automation/all)
- `src/pages/marketing/Reports.tsx` -- UI com filtros de fonte + coluna origem na tabela

