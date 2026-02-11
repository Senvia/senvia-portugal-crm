

## Equipas Hierarquicas - Lider ve os dados da sua equipa

### Resumo

Criar um sistema de equipas onde um membro (ex: Diretor Comercial) tem vendedores atribuidos a ele. Esse lider consegue ver os leads, vendas e dados dos membros da sua equipa -- sem precisar de ser admin.

### Como funciona hoje

- **Admin**: ve tudo (todos os membros, todos os dados)
- **Salesperson/Viewer**: ve apenas os seus proprios dados (filtrado por `assigned_to = user.id`)
- Nao existe conceito de "lider de equipa" -- ou ves tudo, ou ves so o teu

### Como vai funcionar

```text
Admin (ve tudo)
  |
  +-- Lider A (ve os seus + equipa dele)
  |     +-- Vendedor 1
  |     +-- Vendedor 2
  |
  +-- Lider B (ve os seus + equipa dele)
  |     +-- Vendedor 3
  |
  +-- Vendedor 4 (ve so os seus)
```

O lider ve:
- Os seus proprios leads/vendas/clientes
- Os leads/vendas/clientes atribuidos aos membros da sua equipa
- Pode filtrar por membro especifico da sua equipa

### Estrutura de dados

**Nova tabela: `teams`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK organizations |
| name | text | Nome da equipa (ex: "Equipa Norte") |
| leader_id | uuid | FK auth.users -- o lider |
| created_at | timestamp | Data de criacao |

**Nova tabela: `team_members`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| team_id | uuid | FK teams |
| user_id | uuid | FK auth.users -- o membro |
| created_at | timestamp | Data de criacao |
| UNIQUE | | (team_id, user_id) |

**RLS:**
- Membros da organizacao podem ler equipas da sua org
- Admins e lideres da equipa podem gerir membros
- Funcao `get_team_member_ids(user_id)` retorna IDs dos membros da equipa do lider (SECURITY DEFINER)

### Alteracao no filtro de dados (useTeamFilter)

Hoje:
- Admin -> ve tudo ou filtra por 1 membro
- Outros -> ve so o proprio

Depois:
- Admin -> ve tudo ou filtra por 1 membro
- Lider -> ve os seus + equipa dele, ou filtra por 1 membro da equipa
- Outros -> ve so o proprio

A logica do `effectiveUserId` passa a suportar um array de user IDs (o proprio + membros da equipa). Os hooks de dados (`useLeads`, `useSales`, etc.) passam a usar `.in('assigned_to', userIds)` em vez de `.eq('assigned_to', userId)`.

### Gestao de equipas (UI)

Em **Configuracoes > Equipa** (tab existente), adicionar uma seccao "Equipas":
- Lista de equipas com nome e lider
- Criar equipa: nome + selecionar lider (dos membros existentes)
- Editar equipa: adicionar/remover membros
- Um membro so pode pertencer a uma equipa

### Ficheiros a criar/alterar

**1. Migracao SQL**
- Criar tabelas `teams` e `team_members` com RLS
- Funcao `get_team_member_ids(uuid)` que retorna os user_ids dos membros da equipa liderada pelo user
- Policies: leitura para membros da org, escrita para admins

**2. Novo hook: `src/hooks/useTeams.ts`**
- CRUD de equipas
- Query equipas por organization_id
- Adicionar/remover membros de equipa

**3. Alterar `src/hooks/useTeamFilter.ts`**
- Detectar se o user e lider de alguma equipa
- Se sim, `effectiveUserId` retorna array com o proprio + membros da equipa
- Expor `canFilterByTeam` tambem para lideres (filtram dentro da sua equipa)
- Novo campo `effectiveUserIds: string[]` para suportar multiplos IDs

**4. Alterar hooks de dados**
Atualizar para usar `.in()` em vez de `.eq()` quando ha multiplos IDs:
- `src/hooks/useLeads.ts`
- `src/hooks/useSales.ts`
- `src/hooks/useClients.ts`
- `src/hooks/useProposals.ts`
- `src/hooks/useDashboardStats.ts`

**5. Alterar `src/components/dashboard/TeamMemberFilter.tsx`**
- Para lideres: mostrar apenas os membros da sua equipa no dropdown
- Para admins: continua a mostrar todos

**6. Nova seccao UI: `src/components/settings/TeamsSection.tsx`**
- Integrada na TeamTab existente
- Lista de equipas com lider e numero de membros
- Modal para criar/editar equipa
- Selecionar lider e arrastar/adicionar membros

### Fluxo

1. Admin vai a Configuracoes > Equipa
2. Na seccao "Equipas", cria "Equipa Norte"
3. Define o Lider A como lider
4. Adiciona Vendedor 1 e Vendedor 2
5. O Lider A, ao entrar no dashboard/leads, ve automaticamente os dados dele + Vendedor 1 + Vendedor 2
6. O Lider A pode filtrar por membro especifico no dropdown de equipa

### Seguranca

- RLS nas tabelas `teams` e `team_members` isolam por organizacao
- A funcao `get_team_member_ids` e SECURITY DEFINER para evitar recursao
- Lideres nao conseguem ver dados de outras equipas
- Admins continuam a ver tudo

