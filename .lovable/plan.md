
## Bugs Encontrados e Correções

### Bug 1: Atualização otimista não inclui `profile_name` e `profile_id` (CAUSA PRINCIPAL)
**Ficheiro:** `src/hooks/useProfile.ts` (linhas 127-136)

Quando o perfil é alterado com sucesso, a atualização otimista do cache só atualiza `role`, mas **não atualiza `profile_id` nem `profile_name`**. Resultado: a tabela mostra o role antigo até fazer refresh manual, porque o `invalidateQueries` só executa depois, e a UI já renderizou com os dados otimistas desatualizados.

**Correção:** Atualizar o `onMutate` para incluir `profile_id` e resolver `profile_name` a partir dos perfis disponíveis:
```tsx
if (variables.action === 'change_role' && variables.new_role) {
  queryClient.setQueryData<TeamMember[]>([...], (old) => {
    return old.map(member => 
      member.user_id === variables.user_id 
        ? { ...member, role: variables.new_role!, profile_id: variables.profile_id || null, profile_name: ??? }
        : member
    );
  });
}
```
O problema é que o hook não tem acesso ao nome do perfil. A solução mais limpa é **passar o `profile_name` como campo opcional** nos params da mutação, preenchido pelo `TeamTab.tsx` no momento do `handleChangeRole`.

### Bug 2: `create-team-member` não recebe `profile_id`
**Ficheiro:** `supabase/functions/create-team-member/index.ts` + `src/components/settings/TeamTab.tsx`

Quando se cria um novo membro com um perfil personalizado (ex: "CE"), o frontend resolve o `base_role` mas **nunca envia o `profile_id`** para a edge function. A edge function também não aceita nem grava `profile_id` no `organization_members`. Resultado: o novo membro fica sem perfil personalizado.

**Correção (3 pontos):**
1. `TeamTab.tsx` `handleCreateMember`: enviar `profile_id` junto com os dados
2. `useTeam.ts` `CreateTeamMemberParams`: adicionar campo `profile_id?: string`
3. `create-team-member/index.ts`: aceitar `profile_id` e incluir no upsert de `organization_members`

### Bug 3: `useCreateTeamMember` hook não envia `profile_id`
**Ficheiro:** `src/hooks/useTeam.ts`

O `CreateTeamMemberParams` não tem campo `profile_id`, e o `mutationFn` não o passa para a edge function.

---

### Plano de Implementação

**1. `src/hooks/useProfile.ts`**
- Adicionar `profile_name?: string` ao `ManageTeamMemberParams`
- No `onMutate` de `change_role`, atualizar também `profile_id` e `profile_name`

**2. `src/components/settings/TeamTab.tsx`**
- No `handleChangeRole`: enviar `profile_name: selectedProfile?.name` na mutação
- No `handleCreateMember`: enviar `profile_id: selectedProfile?.id` ao criar membro

**3. `src/hooks/useTeam.ts`**
- Adicionar `profile_id?: string` ao `CreateTeamMemberParams`
- Passar `profile_id` no body da chamada à edge function

**4. `supabase/functions/create-team-member/index.ts`**
- Aceitar `profile_id` no body
- Incluir `profile_id` no upsert de `organization_members`
