

## Corrigir erro "column reference import_id is ambiguous"

### Causa
A função RPC `import_commission_chargebacks` retorna uma coluna chamada `import_id` na cláusula `RETURNS TABLE(import_id uuid, ...)`. Internamente, o SQL usa `import_id` como referência de coluna (ex: `WHERE import_id = v_import_id`), e o PostgreSQL não consegue distinguir entre a coluna da tabela e o campo de retorno da função.

### Correção
Migração SQL para recriar a função, qualificando todas as referências ambíguas a `import_id` com o alias da tabela (ex: `ci.import_id`) ou usando a variável local `v_import_id` diretamente nos WHERE clauses em vez de referenciar a coluna de output.

Concretamente, nas queries internas:
- `WHERE import_id = v_import_id` → `WHERE ci.import_id = v_import_id` (com alias na tabela `commission_chargeback_items ci`)
- Na CTE `parsed_rows`, a coluna `import_id` do SELECT entra em conflito com o RETURN — renomear para usar `v_import_id` diretamente no INSERT sem passar pela CTE

**Ficheiro:** migração SQL (função `import_commission_chargebacks`)

