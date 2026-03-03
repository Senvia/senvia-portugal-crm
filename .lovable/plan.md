

## Corrigir alteração de perfil: `profile_id` não é atualizado

### Problema
Quando se altera o perfil de um membro (ex: para "CE"), o sistema apenas atualiza a tabela `user_roles` com o `base_role` (ex: "salesperson"). Mas nunca atualiza o `profile_id` na tabela `organization_members`, que é o campo que realmente determina qual perfil personalizado o utilizador tem. Resultado: o perfil parece não mudar.

### Correção (3 ficheiros)

**1. Frontend — `src/components/settings/TeamTab.tsx`**
- Na função `handleChangeRole`, enviar também o `profile_id` selecionado para o edge function:
  ```tsx
  manageTeamMember.mutate({
    action: 'change_role',
    user_id: selectedMember.user_id,
    new_role: resolvedRole,
    profile_id: selectedProfile?.id,  // novo campo
  });
  ```

**2. Hook — `src/hooks/useProfile.ts`**
- Adicionar `profile_id?: string` ao interface `ManageTeamMemberParams`.

**3. Edge Function — `supabase/functions/manage-team-member/index.ts`**
- Aceitar `profile_id` no body do request.
- No case `change_role`, após atualizar `user_roles`, também atualizar `organization_members.profile_id` e `.role`:
  ```typescript
  await supabaseAdmin
    .from('organization_members')
    .update({ 
      role: new_role,
      profile_id: profile_id || null 
    })
    .eq('user_id', user_id)
    .eq('organization_id', sharedOrgId);
  ```

Isto garante que o perfil personalizado (com permissões granulares) fica realmente associado ao membro.

