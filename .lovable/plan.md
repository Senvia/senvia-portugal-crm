

## Corrigir: Desativar membro deve excluí-lo do round-robin

### Problema
Quando um admin desativa um membro (toggle_status), o sistema apenas bane o utilizador no Supabase Auth. O campo `is_active` na tabela `organization_members` **não é atualizado**, por isso o round-robin continua a atribuir leads a membros "inativos".

### Solução
No edge function `manage-team-member`, na ação `toggle_status`, adicionar a atualização do campo `is_active` na tabela `organization_members` quando o utilizador é banido/desbanido.

### Alteração

**`supabase/functions/manage-team-member/index.ts`** — Na ação `toggle_status`:

- Quando o utilizador é **banido**: atualizar `organization_members.is_active = false`
- Quando o utilizador é **desbanido**: atualizar `organization_members.is_active = true`

```typescript
// Após ban/unban bem-sucedido, sincronizar is_active:
await supabaseAdmin
  .from('organization_members')
  .update({ is_active: !isBanned ? false : true })
  .eq('user_id', user_id)
  .eq('organization_id', sharedOrgId);
```

Isto garante que membros desativados são automaticamente excluídos do round-robin de atribuição de leads.

