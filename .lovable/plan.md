

# Corrigir INSERT em Pedidos Internos (Cache PostgREST)

## Problema
A policy de INSERT na tabela `internal_requests` ja esta correta na base de dados (PERMISSIVE), mas o PostgREST (camada de API) pode estar a usar uma versao em cache das policies. Isto acontece quando uma migracao altera policies mas o PostgREST nao recarrega o schema automaticamente.

## Solucao
Criar uma migracao que:
1. Faz DROP e recria a policy INSERT (para garantir que e aplicada de forma limpa)
2. Envia um `NOTIFY pgrst, 'reload schema'` para forcar o PostgREST a recarregar as policies

---

## Seccao Tecnica

### Migracao SQL

```sql
-- Forcar recriacao da policy INSERT
DROP POLICY IF EXISTS "Authenticated users can create requests" ON internal_requests;

CREATE POLICY "Authenticated users can create requests"
ON internal_requests FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_org_id(auth.uid())
  AND submitted_by = auth.uid()
);

-- Forcar PostgREST a recarregar o schema/policies
NOTIFY pgrst, 'reload schema';
```

### Ficheiros a alterar
| Ficheiro | Acao |
|---|---|
| Migracao SQL | Criar -- recriar policy + NOTIFY pgrst |

Nenhum ficheiro de codigo precisa de ser alterado.

