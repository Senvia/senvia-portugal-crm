

## Diagnóstico

O erro nos logs da edge function `create-team-member` é claro:

```
Error checking role: { code: "PGRST116", details: "The result contains 2 rows", message: "Cannot coerce the result to a single JSON object" }
```

O utilizador atual (super_admin) tem **duas entradas** na tabela `user_roles` (ex: `admin` + `super_admin`). A query usa `.single()` com `.in('role', ['admin', 'super_admin'])`, que falha quando encontra mais de 1 resultado.

## Correção

No ficheiro `supabase/functions/create-team-member/index.ts`, substituir a query de verificação de role (linhas ~97-104):

**Antes:**
```typescript
const { data: roleData, error: roleError } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', currentUser.id)
  .in('role', ['admin', 'super_admin'])
  .single();

if (roleError || !roleData) {
```

**Depois:**
```typescript
const { data: roleData, error: roleError } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', currentUser.id)
  .in('role', ['admin', 'super_admin']);

if (roleError || !roleData || roleData.length === 0) {
```

Remover `.single()` e verificar `roleData.length === 0` em vez de `!roleData`. Isto resolve o caso em que o utilizador tem ambos os roles `admin` e `super_admin`.

