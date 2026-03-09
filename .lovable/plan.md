

## Investigação: Erro ao criar lead

### O que encontrei

1. **RLS policies** estão correctas — existe INSERT policy com `WITH CHECK (organization_id = get_user_org_id(auth.uid()))`
2. **Schema** está correcto — `email`, `phone` e `name` são NOT NULL mas o formulário envia `''` quando vazios (válido)
3. **Triggers** — não existem triggers na tabela `leads` que possam falhar
4. **Dados reais** — leads estão sendo criadas hoje (última às 11:43), então o sistema funciona em alguns casos

### Problema provável

Sem logs de consola ou rede disponíveis, não consigo ver o erro exacto. Mas há um problema potencial no `get_user_org_id()`:

- O `AuthContext` usa `supabase.auth.updateUser({ data: { active_organization_id: orgId } })` — isto guarda em `user_metadata`
- Mas a função `get_user_org_id()` lê de `app_metadata` no JWT
- Resultado: o lookup por JWT **sempre falha**, e cai no fallback que busca o primeiro `organization_members`
- Se o fallback retornar um `organization_id` diferente do que o frontend envia, o INSERT é bloqueado pelo RLS

### Plano de correção

1. **Adicionar console.log detalhado** no `onError` do `useCreateLead` para capturar o erro exacto na próxima tentativa
2. **Corrigir `get_user_org_id()`** para também verificar `user_metadata` (onde o `updateUser` realmente guarda o `active_organization_id`):
```sql
-- Tentar app_metadata primeiro, depois user_metadata
active_org := COALESCE(
  (jwt_claims->'app_metadata'->>'active_organization_id')::UUID,
  (jwt_claims->'user_metadata'->>'active_organization_id')::UUID
);
```

3. **Alternativa mais simples**: mudar o `AuthContext` para usar `supabase.auth.admin.updateUserById` com `app_metadata` — mas isto requer service role key no frontend (inseguro), então a opção 2 é melhor.

### Ficheiros a alterar
- **Migração SQL** — actualizar `get_user_org_id()` para ler `user_metadata` como fallback
- **`src/hooks/useLeads.ts`** — adicionar logging mais detalhado no `onError` do `useCreateLead`

### Risco
Baixo — a alteração apenas adiciona um fallback extra na função de lookup, sem quebrar lógica existente.

