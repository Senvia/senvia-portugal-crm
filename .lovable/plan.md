

## Corrigir Erro "Infinite Recursion" na Tabela de Membros

### Problema

O cliente Perfect2Gether nao consegue adicionar membros a equipa porque a base de dados retorna o erro:

> **infinite recursion detected in policy for relation "organization_members"**

A politica de seguranca "Admins manage org members" consulta a propria tabela `organization_members` dentro da sua regra de acesso, criando um ciclo infinito.

### Solucao

1. **Criar uma funcao auxiliar** `is_org_member` com `SECURITY DEFINER` que verifica se o utilizador pertence a uma organizacao sem passar pelas regras de seguranca (evitando a recursao).

2. **Substituir a politica problematica** por uma nova que use esta funcao segura em vez de consultar a tabela diretamente.

### Secao Tecnica

**Migracao SQL a executar:**

```sql
-- 1. Funcao auxiliar SECURITY DEFINER para verificar membership sem recursao
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_active = true
  )
$$;

-- 2. Remover politica que causa recursao
DROP POLICY IF EXISTS "Admins manage org members" ON public.organization_members;

-- 3. Criar politica corrigida usando a funcao segura
CREATE POLICY "Admins manage org members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_role(auth.uid(), 'admin'::app_role)
);
```

**Nenhum ficheiro de codigo precisa de ser alterado.** O problema esta exclusivamente na base de dados.

### Resultado Esperado

Apos a migracao, os administradores da Perfect2Gether (e de todas as organizacoes) poderao adicionar membros a equipa sem erros.

