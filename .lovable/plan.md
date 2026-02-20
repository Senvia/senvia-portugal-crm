

## Corrigir RLS da tabela lead_attachments para Super Admins

### Problema

O upload do ficheiro para o storage agora funciona (retorna 200), mas o INSERT na tabela `lead_attachments` falha com **403 RLS violation**.

As 3 politicas RLS da tabela `lead_attachments` usam apenas `is_org_member()`, que retorna `false` para super_admins a visualizar organizacoes onde nao sao membros diretos.

### Solucao

Atualizar as 3 politicas RLS da tabela `lead_attachments` para incluir `has_role(auth.uid(), 'super_admin')`:

**Migracao SQL:**

```sql
-- 1. INSERT
DROP POLICY IF EXISTS "Members can insert lead attachments" ON public.lead_attachments;
CREATE POLICY "Members can insert lead attachments" ON public.lead_attachments
  FOR INSERT WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 2. SELECT
DROP POLICY IF EXISTS "Members can view lead attachments" ON public.lead_attachments;
CREATE POLICY "Members can view lead attachments" ON public.lead_attachments
  FOR SELECT USING (
    is_org_member(auth.uid(), organization_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3. DELETE
DROP POLICY IF EXISTS "Members can delete lead attachments" ON public.lead_attachments;
CREATE POLICY "Members can delete lead attachments" ON public.lead_attachments
  FOR DELETE USING (
    is_org_member(auth.uid(), organization_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
```

Nenhuma alteracao de codigo frontend necessaria.
