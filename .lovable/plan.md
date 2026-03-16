
Objetivo

Corrigir o erro de acesso nos Prospects para super admins, sem abrir permissões indevidas para utilizadores normais.

Do I know what the issue is?

Sim.

O problema exato

- O frontend já considera super admin como tendo acesso à área Perfect2Gether:
  - `src/lib/perfect2gether.ts` → `hasPerfect2GetherAccess(... if (isSuperAdmin) return true)`
- Mas o backend dos Prospects não faz esse bypass:
  - `public.prospects` usa RLS só com `public.is_org_member(auth.uid(), organization_id)`
  - `public.distribute_prospects_round_robin(...)` também bloqueia quem não for membro direto
- Resultado:
  - o super admin entra no módulo,
  - tenta importar,
  - o insert em lote falha,
  - o fallback tenta inserir linha a linha,
  - todas as 150 linhas falham com a mesma negação de acesso.

O que vou corrigir

1. Alinhar o backend com a regra de super admin
- Atualizar as policies de `public.prospects` para permitir:
  - membros ativos da organização, ou
  - utilizadores com role `super_admin`
- Isto aplica-se a:
  - SELECT
  - INSERT
  - UPDATE
  - DELETE

2. Corrigir a função de distribuição
- Atualizar `public.distribute_prospects_round_robin(...)` para aceitar:
  - `is_org_member(...)`
  - ou `has_role(auth.uid(), 'super_admin')`
- Assim o mesmo problema não volta a acontecer ao distribuir prospects.

3. Alinhar a navegação com a regra real de acesso
- Rever `src/components/layout/AppSidebar.tsx`
- Hoje o menu “Prospects” aparece só por `organization?.id === Perfect2Gether`
- Vou alinhar com a mesma lógica de acesso usada na página:
  - Perfect2Gether + membership válido
  - ou super admin

4. Melhorar a mensagem de erro
- Em `src/hooks/useProspects.ts`, refinar a mensagem para distinguir melhor:
  - falta de membership real
  - ou bloqueio indevido do backend para super admin
- Isto evita voltar a parecer que “a tua conta não tem acesso” quando na verdade o problema é incoerência entre frontend e backend.

Porque isto aconteceu

- A implementação ficou inconsistente:
  - frontend: “super admin pode”
  - backend: “só membro direto pode”
- Como a importação tem fallback linha a linha, o erro apareceu multiplicado em todas as linhas do ficheiro.

Ficheiros / áreas a ajustar

- `supabase/migrations/...`  
  nova migration para corrigir as RLS de `public.prospects` e a função `distribute_prospects_round_robin`
- `src/components/layout/AppSidebar.tsx`
- `src/hooks/useProspects.ts`
- possivelmente `src/lib/perfect2gether.ts` apenas para uniformizar naming/uso

Resultado esperado

- Se estiveres autenticado como super admin, consegues importar prospects na Perfect2Gether mesmo sem membership direto.
- Utilizadores normais continuam dependentes de membership ativo na organização.
- A distribuição round-robin também passa a funcionar para super admin.
- O erro deixa de aparecer por um problema de política inconsistente.
