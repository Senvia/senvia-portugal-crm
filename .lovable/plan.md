

## Problema: Listas da Senvia não aparecem

### Diagnóstico
- As 12 listas existem na base de dados para a organização Senvia Agency (`06fe9e1d-...`)
- As políticas RLS da tabela `client_lists` usam `get_user_org_id(auth.uid())` que depende do `active_organization_id` no JWT
- Se o JWT não estiver sincronizado com a organização ativa no frontend, o RLS bloqueia o acesso
- As tabelas `marketing_contacts` e `marketing_list_members` já usam `is_org_member()` e funcionam corretamente

### Solução
Atualizar as 4 políticas RLS de `client_lists` para usar `is_org_member()` em vez de `get_user_org_id()`, alinhando com o padrão já usado nas outras tabelas de marketing.

### Alteração (1 migration SQL)

```sql
-- DROP existing policies
DROP POLICY "Users can view their organization's lists" ON public.client_lists;
DROP POLICY "Users can create lists in their organization" ON public.client_lists;
DROP POLICY "Users can update their organization's lists" ON public.client_lists;
DROP POLICY "Users can delete their organization's lists" ON public.client_lists;

-- Recreate with is_org_member
CREATE POLICY "Users can view their organization's lists"
  ON public.client_lists FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create lists in their organization"
  ON public.client_lists FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their organization's lists"
  ON public.client_lists FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their organization's lists"
  ON public.client_lists FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));
```

### Resultado
- As listas voltarão a aparecer independentemente do estado do JWT
- Sem alterações no frontend — apenas correção das políticas RLS
- Alinha o padrão de segurança com as restantes tabelas de marketing

