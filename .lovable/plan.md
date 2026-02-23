

# Corrigir Alucinação do Otto nas Notas de Crédito

## Problema

O Otto inventou notas de crédito que não existem ("TecnoPrime Lda", "João Paulo Matos", "Global Soluções S.A."). Isto acontece porque:

1. A ferramenta `search_credit_notes` foi adicionada ao código do Otto, mas a **função de base de dados** (`search_credit_notes_unaccent`) que ela chama **nunca foi criada** -- a migração ficou pendente.
2. Quando a ferramenta falha com erro, o modelo de IA **inventa resultados** em vez de dizer "não encontrei".

Na realidade, só existem 2 notas de crédito na base de dados (ambas de "Dnr lda").

## Solução (2 passos)

### 1. Criar a função de base de dados em falta

Executar a migração SQL para criar `search_credit_notes_unaccent` -- a função que pesquisa notas de crédito por referência ou nome de cliente, com suporte para acentos.

```sql
CREATE OR REPLACE FUNCTION public.search_credit_notes_unaccent(
  org_id uuid,
  search_term text,
  cn_status text DEFAULT NULL,
  max_results int DEFAULT 10
) RETURNS SETOF credit_notes AS $$
  SELECT * FROM credit_notes
  WHERE organization_id = org_id
    AND (cn_status IS NULL OR status = cn_status)
    AND (
      immutable_unaccent(lower(COALESCE(reference, '')))
        LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
      OR immutable_unaccent(lower(COALESCE(client_name, '')))
        LIKE '%' || immutable_unaccent(lower(search_term)) || '%'
    )
  ORDER BY date DESC NULLS LAST
  LIMIT max_results;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';
```

### 2. Reforçar anti-alucinação no system prompt do Otto

Adicionar uma regra explícita ao `SYSTEM_PROMPT` para que, quando uma ferramenta retorna erro ou zero resultados, o Otto **nunca invente dados**:

```
REGRA ABSOLUTA: Se uma ferramenta retornar um erro ou zero resultados,
diz EXATAMENTE "Não encontrei resultados" e sugere termos alternativos.
NUNCA inventes registos, referências ou nomes de clientes.
```

### Ficheiros a alterar
1. **Nova migração SQL** -- criar `search_credit_notes_unaccent`
2. **`supabase/functions/otto-chat/index.ts`** -- reforçar regra anti-alucinação no system prompt
