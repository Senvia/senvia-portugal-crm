

# Corrigir Constraint da Base de Dados (sales_status_check)

## Problema

A base de dados só aceita os estados: `pending`, `in_progress`, `delivered`, `cancelled`.
O código usa `fulfilled` (Entregue) que não existe na restrição. Por isso dá erro ao mudar o estado.

## Solução

Atualizar a constraint na base de dados para incluir `fulfilled`.

## Secção Técnica

### Migração SQL

```sql
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
  CHECK (status = ANY (ARRAY['pending','in_progress','fulfilled','delivered','cancelled']));
```

### Ficheiros editados

Apenas 1 migração SQL. Nenhum ficheiro de código precisa de ser alterado.

