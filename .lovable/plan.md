

## Corrigir RLS para super_admins no `monthly_commitments`

### Problema

O utilizador é **super_admin** e está a visualizar a organização **Perfect2Gether** (telecom). Ao guardar o compromisso, o código envia `organization_id = Perfect2Gether`, mas a política RLS usa `get_user_org_id(auth.uid())` que retorna **Senvia Agency** (a org onde o utilizador tem membership real). Como os IDs não coincidem, o INSERT é rejeitado.

Este é o mesmo padrão usado noutras tabelas, mas aqui o super_admin precisa escrever dados para orgs que não são "suas".

### Correção

Migração SQL para atualizar as 4 políticas de INSERT/UPDATE/DELETE do `monthly_commitments` e as 3 do `commitment_lines`, adicionando um bypass para super_admins via `has_role(auth.uid(), 'super_admin')`:

**monthly_commitments:**
- **INSERT**: `WITH CHECK (has_role(auth.uid(), 'super_admin') OR (user_id = auth.uid() AND organization_id = get_user_org_id(auth.uid())))`
- **UPDATE/DELETE**: mesma lógica com `USING` e `WITH CHECK`

**commitment_lines** — mesma abordagem, adicionando `has_role` OR na subquery.

Também dropar a policy antiga `"Members can view org commitments"` que ficou órfã.

**1 migração SQL**, nenhuma alteração de código.

