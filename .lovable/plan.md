

## Corrigir: Push notifications devem ir apenas para admins + comercial atribuído

### Problema
Quando um novo lead chega, o `submit-lead` chama `send-push-notification` apenas com `organization_id`. A função `send-push-notification` envia para **todas** as subscriptions da organização, sem filtrar por utilizador. Resultado: todos os comerciais (incluindo a Bruna) recebem push de todos os leads.

### Solução
Adicionar um parâmetro opcional `user_ids` ao `send-push-notification` para filtrar as subscriptions por utilizador. No `submit-lead`, passar os IDs dos admins + o comercial atribuído.

### Alterações

**1. `supabase/functions/send-push-notification/index.ts`**
- Adicionar campo `user_ids?: string[]` ao interface `PushNotificationRequest`
- Quando `user_ids` é fornecido, filtrar a query: `.in('user_id', user_ids)`
- Quando não é fornecido, manter comportamento atual (enviar a todos da org)

**2. `supabase/functions/submit-lead/index.ts`** (2 locais: webhook mode ~linha 204 e standard mode ~linha 696)
- Antes de chamar `send-push-notification`, construir array de `user_ids` com:
  - Todos os membros com `role = 'admin'` da organização
  - O `assigned_to` (comercial atribuído ao lead)
- Passar `user_ids` no payload do push

### Resultado
Comerciais como a Bruna só recebem push notifications quando o lead lhes é atribuído. Admins continuam a receber todas.

