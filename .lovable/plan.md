

## Adicionar botão "+ Adicionar Saldo" no dialog de Gerir Saldos

### Problema
O dialog "Gerir Saldos" só mostra membros que já têm saldo configurado. Não existe forma de adicionar saldos para novos membros da equipa.

### Solução

**Ficheiro: `src/components/portal-total-link/rh/RhAdminPanel.tsx`**

1. Adicionar botão "+ Adicionar Membro" no dialog de saldos
2. Ao clicar, abrir um sub-dialog que:
   - Busca todos os membros da organização via `organization_members` + `profiles`
   - Filtra os que **já têm** saldo configurado (para não duplicar)
   - Mostra um select/lista dos membros disponíveis
   - Input para definir os dias totais (default: 22)
   - Ao guardar, usa o `useUpdateVacationBalance` (que já faz upsert)

**Ficheiro: `src/hooks/useRhAbsences.ts`**

3. Adicionar hook `useOrgMembers()` que retorna os membros da organização (id, full_name) para popular o select de "adicionar membro"

### Ficheiros alterados
- `src/hooks/useRhAbsences.ts` — novo hook `useOrgMembers`
- `src/components/portal-total-link/rh/RhAdminPanel.tsx` — botão + dialog para adicionar saldo a novo membro

