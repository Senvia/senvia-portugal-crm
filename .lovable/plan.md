

## Corrigir exibição do perfil na tabela de equipa

### Diagnóstico
A base de dados **está correta** — o Thiago já tem `profile_id` do "CE" atribuído. O problema é que o frontend nunca recebe essa informação:

1. **Edge function `get-team-members`** — seleciona apenas `user_id, role, is_active` da tabela `organization_members`. Não inclui `profile_id`.
2. **Resultado retornado** — não contém `profile_id` nem o nome do perfil personalizado.
3. **Tabela no frontend** — mostra `ROLE_LABELS[member.role]` (ex: "Comercial"), nunca o nome do perfil real (ex: "CE").

### Correção (3 ficheiros)

**1. Edge Function — `supabase/functions/get-team-members/index.ts`**
- Linha 118: adicionar `profile_id` ao select: `'user_id, role, is_active, profile_id'`
- Na construção do resultado (linha 174-184): incluir `profile_id` e fazer join com `organization_profiles` para obter o nome do perfil
- Retornar `profile_id` e `profile_name` no objeto de cada membro

**2. Interface — `src/hooks/useTeam.ts`**
- Adicionar `profile_id?: string` e `profile_name?: string` ao `TeamMember` interface

**3. Frontend — `src/components/settings/TeamTab.tsx`**
- Na tabela (linha 567-569): mostrar `member.profile_name` quando existir, caso contrário fallback para `ROLE_LABELS[member.role]`
- No "Perfil Atual" do modal (linha 775-777): mostrar o nome do perfil em vez do role genérico
- No `openChangeRoleModal`: usar `member.profile_id` diretamente (sem cast para `any`)

