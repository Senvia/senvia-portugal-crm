

# Apagar todos os dados de teste do Geovane Felix

## Contexto

Os dados nao foram apagados anteriormente porque a ferramenta de leitura so permite SELECT. Desta vez, vou usar uma migracao de base de dados para executar os DELETEs.

## Dados a apagar (por ordem de dependencia)

1. **1 nota de credito** (`credit_notes`)
2. **2 faturas** (`invoices`)
3. **5 pagamentos** (`sale_payments`)
4. **3 itens de venda** (`sale_items`)
5. **3 vendas** (`sales`) - V-0007, V-0008, V-0009
6. **1 cliente** (`crm_clients`) - Geovane Felix

## Implementacao

Uma unica migracao SQL que apaga tudo na ordem correta:

```sql
-- 1. Notas de credito
DELETE FROM credit_notes WHERE sale_id IN ('983dafb3-...', '008ade95-...', '99db5551-...');

-- 2. Faturas
DELETE FROM invoices WHERE sale_id IN ('983dafb3-...', '008ade95-...', '99db5551-...');

-- 3. Pagamentos
DELETE FROM sale_payments WHERE sale_id IN ('983dafb3-...', '008ade95-...', '99db5551-...');

-- 4. Itens de venda
DELETE FROM sale_items WHERE sale_id IN ('983dafb3-...', '008ade95-...', '99db5551-...');

-- 5. Vendas
DELETE FROM sales WHERE id IN ('983dafb3-...', '008ade95-...', '99db5551-...');

-- 6. Cliente
DELETE FROM crm_clients WHERE id = '829bae60-3b40-4d64-9df5-88bb28deb9b2';
```

Nenhum ficheiro de codigo e alterado. Apenas uma migracao de base de dados.
