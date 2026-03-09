

## Fix: Vendedores veem dados de todos os colaboradores

### Problema
No `SalesPerformancePanel`, a lista de membros (`memberList`) usa TODOS os membros da organização independentemente do perfil do utilizador. Um vendedor com `data_scope='own'` vê os objetivos e vendas de toda a equipa.

### Causa (linha 67-68)
```typescript
const memberList = members.length > 0 ? members : [...];
const filteredMembers = selectedMemberId ? memberList.filter(...) : memberList;
```
Não há filtro por `dataScope` — só filtra se o admin escolher um membro específico no dropdown.

### Correção — `src/components/dashboard/SalesPerformancePanel.tsx`

Importar `dataScope`, `isTeamLeader`, `teamMemberIds` do `useTeamFilter` e aplicar a lógica:

- **`data_scope='own'`**: `filteredMembers` = apenas o utilizador logado
- **`data_scope='team'` + líder**: mostra o próprio + membros da equipa
- **`data_scope='all'`**: comportamento atual (todos, com filtro opcional)

Substituir linhas 67-68 por:
```typescript
const allMemberList = members.length > 0 ? members : (user?.id ? [...] : []);

const filteredMembers = useMemo(() => {
  if (dataScope === 'own' || (!canFilterByTeam)) {
    return allMemberList.filter(m => m.user_id === user?.id);
  }
  if (selectedMemberId) {
    return allMemberList.filter(m => m.user_id === selectedMemberId);
  }
  if (dataScope === 'team' && isTeamLeader) {
    const allowed = new Set([user?.id, ...teamMemberIds].filter(Boolean));
    return allMemberList.filter(m => allowed.has(m.user_id));
  }
  return allMemberList; // admin sem filtro
}, [allMemberList, dataScope, canFilterByTeam, selectedMemberId, isTeamLeader, teamMemberIds, user?.id]);
```

Também esconder o botão de editar objetivos para non-admins (já está feito com `isAdmin`).

### Resultado
- Vendedor normal: vê apenas a sua própria linha
- Team leader: vê a sua equipa
- Admin: vê todos (com filtro opcional)

