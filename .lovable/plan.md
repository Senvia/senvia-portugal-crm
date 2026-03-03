

## Corrigir automação de email para vendas (e propostas)

### Problema
A edge function `process-automation` assume que todos os registos têm campos `email` e `name` directamente (linhas 62-63):
```js
const recipientEmail = (record.email as string) || '';
const recipientName = (record.name as string) || '';
```

Isto funciona para `leads` e `crm_clients` (que têm `email` e `name`), mas falha para:
- **Sales** — tem `client_id`, sem `email`/`name`
- **Proposals** — tem `client_id`, sem `email`/`name`

### Solução
Alterar `supabase/functions/process-automation/index.ts` para resolver o email/nome do destinatário a partir do `client_id` quando o registo não tem email directo:

1. Após obter o `record`, verificar se tem `email` directo
2. Se não tiver mas tiver `client_id`, fazer query à tabela `crm_clients` para buscar `email` e `name`
3. Usar esses valores como destinatário

```js
// Resolve recipient - direct fields or via client_id lookup
let recipientEmail = (record.email as string) || '';
let recipientName = (record.name as string) || '';

if (!recipientEmail && record.client_id) {
  const { data: client } = await supabase
    .from('crm_clients')
    .select('email, name')
    .eq('id', record.client_id)
    .single();
  
  if (client) {
    recipientEmail = client.email || '';
    recipientName = client.name || '';
  }
}
```

### Ficheiro a editar
- `supabase/functions/process-automation/index.ts` — linhas 61-71, adicionar lookup por `client_id`

### Impacto
- Corrige `sale_created`, `sale_status_changed`, `proposal_created`, `proposal_status_changed`
- Mantém o comportamento actual para `lead_created` e `client_created` (que já têm email directo)

