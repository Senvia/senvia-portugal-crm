

## Filtrar Compromisso pelo filtro de colaborador

O `CommitmentPanel` não lê o filtro global `useTeamFilter`. Quando o admin seleciona um colaborador no dropdown, o painel de compromisso continua a mostrar todos.

### Alteração

**`CommitmentPanel.tsx`** — importar `useTeamFilter` e filtrar as `rows` pelo `selectedMemberId`:

1. Importar `useTeamFilter` do hook existente
2. Obter `selectedMemberId` e `effectiveUserIds`
3. Após construir as `rows`, aplicar filtro: se `selectedMemberId` estiver definido, mostrar apenas a linha desse colaborador
4. Se `effectiveUserIds` (equipa do líder), filtrar por esse array
5. Os totais no footer recalculam automaticamente com base nas rows filtradas

Alteração isolada a **um único ficheiro**.

