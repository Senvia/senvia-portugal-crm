
Objetivo

Fazer a importação guardar e mostrar o campo onde vêm valores como “CONCORRENCIA” e “EDPC”, porque hoje essa informação existe no ficheiro mas não aparece no sistema.

O que encontrei

- A importação já lê a coluna `COM`, mas guarda isso apenas em `metadata.com`.
- A lista de Prospects e a exportação mostram `segment`, não `metadata.com`.
- Como o teu ficheiro tem a coluna mas o sistema não a expõe, parece que “não importou”, quando na prática está a ficar escondido nos metadados.

O problema real

- `buildProspectPayload()` em `src/lib/prospects/import.ts` faz:
  - `segment` a partir de `Segmento`
  - `metadata.com` a partir de `COM`
- A UI (`src/pages/Prospects.tsx`) só mostra `prospect.segment`.
- Resultado:
  - se o ficheiro não tiver `Segmento`,
  - mas tiver `COM = CONCORRENCIA / EDPC`,
  - essa informação não aparece na grelha nem exportação.

O que vou ajustar

1. Mapear `COM` também para o campo principal visível
- Atualizar a lógica da importação para usar:
  - `Segmento`, se existir
  - senão `COM`, como fallback
- Continuar a guardar `COM` em `metadata.com` também, para não perder o valor original.

2. Alinhar a visualização
- Na página de Prospects, mostrar o valor principal corretamente no local onde hoje aparece `segment`.
- Assim “CONCORRENCIA” e “EDPC” passam a aparecer na tabela logo após a importação.

3. Alinhar a exportação
- Ajustar a exportação CSV/Excel para levar esse mesmo valor visível.
- Isso evita divergência entre o que aparece no sistema e o que sai no ficheiro exportado.

4. Melhorar robustez de aliases
- Aproveitar para aceitar variações comuns do cabeçalho, por exemplo:
  - `COM`
  - `Com`
  - `Concorrência`
  - `Concorrencia`
  - eventualmente `Comercializadora` / equivalente, se existir no ficheiro
- Isto reduz falhas por diferença de nome da coluna.

5. Compatibilidade com dados já importados
- Para novos imports, o valor já entra visível corretamente.
- Para registos antigos, como o valor já pode estar em `metadata.com`, posso ler esse fallback na UI/export para não ficar “vazio” quando o `segment` estiver nulo.

Ficheiros a ajustar

- `src/lib/prospects/import.ts`
- `src/pages/Prospects.tsx`
- `src/lib/export.ts`
- possivelmente `src/types/prospects.ts` apenas se eu formalizar melhor o tipo de `metadata`

Resultado esperado

- Se a tua folha tiver `COM` com “CONCORRENCIA” ou “EDPC”, isso passa a aparecer no sistema.
- Não precisas de criar uma coluna nova no ficheiro chamada `Segmento`.
- Os dados antigos e novos ficam mais consistentes na lista e na exportação.

Detalhe técnico

A implementação mais segura é tratar `COM` como fallback de `segment`:
- `segment = Segmento || COM`
- `metadata.com = COM`

Assim:
- a UI continua simples, porque já usa `segment`
- não perdemos o valor original importado
- não é preciso alterar schema da base de dados
