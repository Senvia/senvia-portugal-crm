

# Adicionar Pesquisa de Notas de Credito ao Otto

## Problema
O Otto nao tem nenhuma ferramenta para pesquisar na tabela `credit_notes`. Quando o utilizador pergunta por uma nota de credito (ex: "2/2026"), o Otto so consegue procurar na tabela `invoices`, onde nao encontra nada.

## Solucao

### 1. Nova funcao RPC no banco de dados
Criar `search_credit_notes_unaccent` seguindo o mesmo padrao das outras 5 funcoes de pesquisa accent-insensitive ja existentes.

```sql
CREATE OR REPLACE FUNCTION public.search_credit_notes_unaccent(
  org_id uuid, search_term text, cn_status text DEFAULT NULL, max_results int DEFAULT 10
) RETURNS SETOF credit_notes AS $$
  SELECT * FROM credit_notes
  WHERE organization_id = org_id
    AND (cn_status IS NULL OR status = cn_status)
    AND (
      immutable_unaccent(lower(COALESCE(reference,''))) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
      OR immutable_unaccent(lower(COALESCE(client_name,''))) LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
    )
  LIMIT max_results;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';
```

### 2. Alteracoes em `supabase/functions/otto-chat/index.ts`

**a) Adicionar tool definition** -- novo item no array `TOOLS`:
```typescript
{
  type: "function",
  function: {
    name: "search_credit_notes",
    description: "Procurar notas de credito por referencia ou nome do cliente.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Referencia ou nome do cliente" },
        status: { type: "string", description: "Filtrar por status (opcional)" },
      },
      required: ["query"],
    },
  },
}
```

**b) Adicionar executor** -- novo `case` no `switch` dentro de `executeTool`:
```typescript
case "search_credit_notes": {
  const { data, error } = await supabaseAdmin
    .rpc("search_credit_notes_unaccent", {
      org_id: orgId, search_term: args.query,
      cn_status: args.status || null, max_results: 10,
    });
  if (error) return JSON.stringify({ error: error.message });
  const results = (data || []).map((cn: any) => ({
    id: cn.id, invoicexpress_id: cn.invoicexpress_id,
    reference: cn.reference, client_name: cn.client_name,
    total: cn.total, status: cn.status, date: cn.date,
    related_invoice_id: cn.related_invoice_id, pdf_path: cn.pdf_path,
  }));
  return JSON.stringify({ results, count: results.length });
}
```

### Ficheiros a alterar
1. **Nova migracao SQL** -- funcao `search_credit_notes_unaccent`
2. **`supabase/functions/otto-chat/index.ts`** -- tool definition + executor

### Resultado
O Otto passara a encontrar "2/2026" na tabela de notas de credito e mostrar: "NC 2/2026 -- Dnr lda -- 611,31 EUR -- Liquidada -- 02/11/2026"
