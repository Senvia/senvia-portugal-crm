

# Corrigir Erro ao Submeter Pedido em "Outros"

## Problema
A policy de INSERT na tabela `internal_requests` esta configurada como **RESTRICTIVE** (nao permissiva). No PostgreSQL, para uma operacao ser permitida, e necessario que pelo menos uma policy **PERMISSIVE** conceda acesso. Se todas as policies forem RESTRICTIVE, nenhum INSERT e permitido, independentemente das condicoes.

## Solucao
Recriar a policy de INSERT como **PERMISSIVE** em vez de RESTRICTIVE. A condicao de seguranca permanece a mesma (o utilizador so pode criar pedidos na sua organizacao e com o seu proprio ID).

---

## Seccao Tecnica

### Migracao SQL

```sql
-- Remover a policy RESTRICTIVE existente
DROP POLICY IF EXISTS "Authenticated users can create requests" ON internal_requests;

-- Recriar como PERMISSIVE (que e o default do CREATE POLICY)
CREATE POLICY "Authenticated users can create requests"
ON internal_requests FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_org_id(auth.uid())
  AND submitted_by = auth.uid()
);
```

A unica diferenca e remover a flag RESTRICTIVE -- a condicao de seguranca (`WITH CHECK`) permanece identica.

### Ficheiros a alterar
| Ficheiro | Acao |
|---|---|
| Migracao SQL | Criar -- recriar policy INSERT como PERMISSIVE |

Nenhum ficheiro de codigo precisa de ser alterado. O problema e exclusivamente na configuracao da base de dados.

