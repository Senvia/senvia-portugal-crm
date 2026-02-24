

# Corrigir Erro "column total does not exist" ao Criar Venda

## Problema

Ao criar uma venda, o sistema retorna erro 42703: `column "total" does not exist`. O insert na tabela `sales` funciona corretamente, mas existe um **trigger de base de dados** (`trigger_update_client_sales_metrics`) que e executado apos o insert e tenta fazer `SUM(total)` quando a coluna correta e `total_value`.

## Causa Raiz

O trigger `update_client_sales_metrics` contem referencias a `SUM(total)` em vez de `SUM(total_value)`. Isto acontece tanto no bloco INSERT/UPDATE como no bloco DELETE:

```sql
-- Errado:
total_value = (SELECT COALESCE(SUM(total), 0) FROM sales ...)
-- Correto:
total_value = (SELECT COALESCE(SUM(total_value), 0) FROM sales ...)
```

## Solucao

Criar uma migracao SQL para substituir a funcao `update_client_sales_metrics` com a referencia correta a coluna `total_value`.

## Secao Tecnica

### Migracao SQL

Recriar a funcao `update_client_sales_metrics()` corrigindo todas as ocorrencias de `SUM(total)` para `SUM(total_value)` nos blocos INSERT/UPDATE e DELETE.

A funcao completa sera reescrita com `CREATE OR REPLACE FUNCTION` mantendo toda a logica existente (total_sales, total_value, total_comissao, total_mwh, total_kwp) apenas corrigindo a referencia da coluna.

### Ficheiros a alterar

- Nenhum ficheiro de codigo -- apenas migracao de base de dados

