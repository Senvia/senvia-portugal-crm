

# Otto: Pesquisa sem Acentos (Accent-Insensitive)

## Problema
Quando o Otto procura "Joao" na base de dados, nao encontra "João" porque o operador `ilike` do PostgreSQL e sensivel a acentos. Isto afeta todas as pesquisas de clientes, leads, faturas, propostas e vendas.

## Solucao
Ativar a extensao `unaccent` do PostgreSQL e criar funcoes de pesquisa dedicadas que removem acentos tanto do termo de pesquisa como dos dados na base de dados.

## Alteracoes

### 1. Migracao SQL
- Ativar a extensao `unaccent`
- Criar uma funcao auxiliar `immutable_unaccent(text)` (necessaria para ser usada em indices)
- Criar 5 funcoes RPC de pesquisa accent-insensitive:
  - `search_clients_unaccent(org_id, search_term, max_results)`
  - `search_leads_unaccent(org_id, search_term, lead_status, max_results)`
  - `search_invoices_unaccent(org_id, search_term, inv_status, max_results)`
  - `search_sales_unaccent(org_id, search_term, pay_status, max_results)`
  - `search_proposals_unaccent(org_id, search_term, prop_status, max_results)`

Cada funcao usa `immutable_unaccent(lower(campo)) LIKE immutable_unaccent(lower(search_term))` para comparar sem acentos.

### 2. Edge Function: `supabase/functions/otto-chat/index.ts`
- Substituir as queries `.from().select().ilike()` por chamadas `.rpc()` as novas funcoes
- Exemplo: em vez de `.from("crm_clients").or("name.ilike.%joao%")`, usar `.rpc("search_clients_unaccent", { org_id, search_term: "joao" })`
- Manter a mesma logica de enriquecimento (ex: buscar nomes de clientes para vendas)
- Sem alteracoes no frontend

## Resultado
- "Joao" encontra "João"
- "clinica" encontra "Clínica"
- "fatura" encontra registos com "Faturação"
- Funciona em todas as pesquisas do Otto (clientes, leads, faturas, vendas, propostas)

## Detalhe Tecnico

### Funcao auxiliar (necessaria para ser IMMUTABLE):
```sql
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
```

### Exemplo de funcao de pesquisa:
```sql
CREATE OR REPLACE FUNCTION public.search_clients_unaccent(
  org_id uuid, search_term text, max_results int DEFAULT 10
) RETURNS SETOF crm_clients AS $$
  SELECT * FROM crm_clients
  WHERE organization_id = org_id
    AND (
      immutable_unaccent(lower(name)) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
      OR immutable_unaccent(lower(COALESCE(email,''))) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
      OR immutable_unaccent(lower(COALESCE(nif,''))) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
      OR immutable_unaccent(lower(COALESCE(company,''))) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
    )
  LIMIT max_results;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Ficheiros a alterar
1. **Nova migracao SQL** -- extensao + 5 funcoes RPC
2. **`supabase/functions/otto-chat/index.ts`** -- substituir queries por chamadas `.rpc()`

