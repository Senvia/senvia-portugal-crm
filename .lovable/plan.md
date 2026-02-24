

# Corrigir Erro ao Atualizar Estado da Venda

## Problema

O erro "violates check constraint sales_status_check" acontece porque a base de dados so aceita os estados: `pending`, `in_progress`, `delivered`, `cancelled`. O codigo TypeScript usa `fulfilled` (Entregue) que **nao existe** na restricao da base de dados.

## Solucao

Atualizar a restricao (CHECK constraint) na base de dados para incluir o estado `fulfilled`.

## Seccao Tecnica

### 1. Migracao SQL

Remover a constraint antiga e criar uma nova que inclua `fulfilled`:

```sql
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
  CHECK (status = ANY (ARRAY['pending','in_progress','fulfilled','delivered','cancelled']));
```

### Ficheiros editados:

1. Migracao SQL (apenas alterar a constraint)

Nenhum ficheiro de codigo precisa de ser alterado -- o problema e exclusivamente na base de dados.
