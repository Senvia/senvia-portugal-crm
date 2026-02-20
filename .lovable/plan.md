
## Corrigir Upload de Anexos para Super Admins

### Problema Identificado

O upload de ficheiros falha com erro **403 (RLS policy violation)** no storage.

**Causa raiz:** O utilizador e super_admin e tem a organizacao "Perfect2Gether" (`96a3950e`) selecionada no UI, mas so tem membership na tabela `organization_members` para "Senvia Agency" (`06fe9e1d`). 

As politicas de storage do bucket `invoices` verificam membership via `is_org_member()` ou `get_user_org_id()` -- ambas retornam a org errada para super_admins que estao a visualizar outra organizacao.

### Solucao

Atualizar as **3 politicas RLS de storage** do bucket `invoices` que usam `is_org_member()` para tambem permitir acesso a super_admins. As politicas afetadas sao:

1. **Members can upload lead attachments** (INSERT)
2. **Members can view lead attachment files** (SELECT)
3. **Members can delete lead attachment files** (DELETE)

### Alteracoes

**Migracao SQL** -- Atualizar as 3 politicas para incluir super_admin:

```sql
-- DROP e recreate das 3 politicas

-- 1. INSERT
DROP POLICY IF EXISTS "Members can upload lead attachments" ON storage.objects;
CREATE POLICY "Members can upload lead attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND (
      (storage.foldername(name))[1] IN (
        SELECT organizations.id::text FROM organizations
        WHERE is_org_member(auth.uid(), organizations.id)
      )
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- 2. SELECT
DROP POLICY IF EXISTS "Members can view lead attachment files" ON storage.objects;
CREATE POLICY "Members can view lead attachment files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices' AND (
      (storage.foldername(name))[1] IN (
        SELECT organizations.id::text FROM organizations
        WHERE is_org_member(auth.uid(), organizations.id)
      )
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- 3. DELETE
DROP POLICY IF EXISTS "Members can delete lead attachment files" ON storage.objects;
CREATE POLICY "Members can delete lead attachment files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'invoices' AND (
      (storage.foldername(name))[1] IN (
        SELECT organizations.id::text FROM organizations
        WHERE is_org_member(auth.uid(), organizations.id)
      )
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
```

Nenhuma alteracao de codigo frontend necessaria -- o problema e exclusivamente nas permissoes de storage.
