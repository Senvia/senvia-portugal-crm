

## Mostrar nome de quem submeteu o pedido

O problema e claro: a query atual faz `select('*')` na tabela `internal_requests`, que nao inclui o nome do utilizador que submeteu. Quem aprova ve apenas o titulo do pedido, sem saber de quem e.

### Alteracoes necessarias

**1. Hook `useInternalRequests.ts`** -- Alterar o select para fazer join com a tabela `profiles`

Mudar de:
```
.select('*')
```
Para:
```
.select('*, submitter:profiles!submitted_by(full_name, avatar_url)')
```

Isto usa a relacao entre `submitted_by` e `profiles.id` para trazer o nome e avatar de quem submeteu.

**2. Tabela `RequestsTable.tsx`** -- Adicionar coluna "Submetido por"

- Adicionar uma nova coluna `<TableHead>` com label "Submetido por"
- Em cada linha, mostrar `r.submitter?.full_name` ou "—" como fallback
- A coluna ficara visivel em desktop e escondida em mobile (`hidden md:table-cell`) para manter a responsividade

**3. Modal `ReviewRequestModal.tsx`** -- Mostrar quem submeteu

- Adicionar um campo "Submetido por" na grelha de detalhes do pedido, exibindo `request.submitter?.full_name`
- Assim, ao abrir qualquer pedido para revisao, o aprovador sabe imediatamente de quem e

### Detalhes tecnicos

- Nao e necessaria nenhuma migracao de base de dados -- a tabela `profiles` ja tem `full_name` e `avatar_url`, e a relacao via `submitted_by` -> `profiles.id` ja existe
- O tipo `InternalRequest` em `src/types/internal-requests.ts` ja tem o campo opcional `submitter?: { full_name: string; avatar_url: string | null }`, portanto nao precisa de alteracao
- As RLS policies de `profiles` permitem SELECT para membros da mesma org e super admins, logo o join vai funcionar

### Ficheiros a alterar
- `src/hooks/useInternalRequests.ts` -- select com join
- `src/components/finance/RequestsTable.tsx` -- nova coluna
- `src/components/finance/ReviewRequestModal.tsx` -- campo de submissor nos detalhes

