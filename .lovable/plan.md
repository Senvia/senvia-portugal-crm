

## Plano: Renomear "Vendedor" → "Comercial" e "Membro" → "Colaborador"

Alterações em **~15 ficheiros** — apenas labels/textos de UI, sem lógica.

### Ficheiros e alterações

**1. `src/types/index.ts`** — Role labels map
- `salesperson: 'Vendedor'` → `salesperson: 'Comercial'`

**2. `src/components/settings/TeamTab.tsx`** — Role labels + UI
- Role map: `salesperson: 'Vendedor'` → `'Comercial'`
- Radio labels: "Vendedor" → "Comercial"
- Descrições: "membro" → "colaborador"
- "Nenhum membro encontrado" → "Nenhum colaborador encontrado"
- "novo membro da equipa" → "novo colaborador"

**3. `src/components/settings/ProfilesTab.tsx`** — Role labels
- `salesperson: 'Vendedor'` → `'Comercial'`
- SelectItem "Vendedor" → "Comercial"

**4. `src/components/settings/TeamsSection.tsx`**
- "vendedores" → "comerciais"
- "Membros" → "Colaboradores"
- "membros" → "colaboradores" (todas as ocorrências)

**5. `src/components/settings/MobileSettingsNav.tsx`**
- "Membros, perfis e equipas" → "Colaboradores, perfis e equipas"

**6. `src/components/dashboard/TeamMemberFilter.tsx`**
- "Todos os membros" → "Todos os colaboradores"

**7. `src/components/shared/BulkActionsBar.tsx`**
- "Atribuir Vendedor Responsável" → "Atribuir Comercial Responsável"

**8. `src/components/shared/AssignTeamMemberModal.tsx`**
- "Atribuir Colaborador" (título) — já está correto
- "Nenhum membro da equipa encontrado" → "Nenhum colaborador encontrado"

**9. `src/components/clients/ClientDetailsDrawer.tsx`**
- "Vendedor Responsável" → "Comercial Responsável"

**10. `src/components/clients/CreateClientModal.tsx`**
- "Vendedor Responsável" → "Comercial Responsável"

**11. `src/components/clients/EditClientModal.tsx`**
- "Vendedor Responsável" → "Comercial Responsável"

**12. `src/types/marketing.ts`**
- `'Vendedor responsável'` → `'Comercial responsável'`

**13. `src/components/layout/MobileMenu.tsx`**
- `return 'Membro'` → `return 'Colaborador'`

**14. `src/components/settings/GeneralContent.tsx`**
- "convidar membros" → "convidar colaboradores"

**15. `src/hooks/useTeam.ts` / `useTeams.ts` / `useProfile.ts`** — Toast messages
- "membro" → "colaborador" nas mensagens de sucesso/erro

