

## Corrigir erro RLS no `monthly_commitments`

### Problema

O erro "new row violates row-level security policy" ocorre porque as políticas RLS do `monthly_commitments` usam `is_org_member()` que consulta a tabela `organization_members`. Se o utilizador não tiver registo nessa tabela (cenário comum com utilizadores legados), o acesso é negado.

A maioria das outras tabelas do sistema usa `get_user_org_id()` que tem fallbacks (JWT → `organization_members` → `profiles`), garantindo compatibilidade.

### Correção

Migração SQL para recriar as 4 políticas RLS do `monthly_commitments` e as 4 do `commitment_lines`, trocando `is_org_member(auth.uid(), organization_id)` por `organization_id = get_user_org_id(auth.uid())` — o mesmo padrão usado em `expenses`, `leads`, `crm_clients`, etc.

Políticas novas para `monthly_commitments`:
- **SELECT**: `organization_id = get_user_org_id(auth.uid())`
- **INSERT**: `user_id = auth.uid() AND organization_id = get_user_org_id(auth.uid())`
- **UPDATE**: mesma condição
- **DELETE**: mesma condição

Políticas novas para `commitment_lines` (via subquery ao `monthly_commitments`):
- **SELECT**: commitment pertence à org do utilizador
- **INSERT/UPDATE/DELETE**: commitment pertence à org E ao utilizador

Ficheiro alterado: **1 migração SQL** apenas. Nenhuma alteração de código necessária.

