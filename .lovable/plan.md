

## Corrigir seleção múltipla no Select de perfis

### Problema
Nos modais "Adicionar Acesso" e "Alterar Perfil", o `<SelectItem>` usa `p.base_role` como `value`. Se existirem 2+ perfis com o mesmo `base_role` (ex: dois perfis "Comercial"), o Select tem valores duplicados e comporta-se de forma errada — selecionar um seleciona todos.

### Correção

**Ficheiro: `src/components/settings/TeamTab.tsx`**

1. **Estado** — Mudar `role` e `newRole` para guardarem o **profile ID** em vez do `base_role` (quando existem perfis personalizados).

2. **SelectItem value** — Usar `p.id` como valor único em vez de `p.base_role`:
   ```tsx
   <SelectItem key={p.id} value={p.id}>
     {p.name}
   </SelectItem>
   ```

3. **Ao submeter (criar membro / alterar perfil)** — Resolver o `base_role` a partir do profile ID selecionado:
   ```tsx
   const selectedProfile = profiles.find(p => p.id === role);
   const resolvedRole = selectedProfile?.base_role || role;
   ```

4. **Ao abrir o modal de alterar perfil** — Pre-selecionar o profile ID atual do membro (via `member.profile_id`) em vez de adivinhar pelo role.

Isto aplica-se a dois blocos:
- Modal "Adicionar Acesso" (linhas ~364-379)
- Modal "Alterar Perfil" (linhas ~778-792)

Alteração circunscrita a um único ficheiro, sem impacto no backend.

