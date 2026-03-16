
Objetivo

Corrigir o erro atual da importação de Prospects, onde o utilizador só vê `[object Object]` e a importação falha sem dizer porquê.

O que já confirmei

- O problema atual já não parece ser “falta de policy” na tabela `prospects`.
- A tabela `prospects` tem `INSERT` com `WITH CHECK (is_org_member(auth.uid(), organization_id))`, o que está correto.
- Também confirmei que existe um utilizador `Thiago` com membership ativo na organização `Perfect2Gether`.
- O erro `[object Object]` vem do frontend: o código está a transformar erros do cliente de base de dados com `String(error)`, mas esses erros são objetos plain e não instâncias de `Error`.

Do I know what the issue is?

Sim, pelo menos a causa principal da mensagem invisível:
- `mapProspectsError()` em `src/hooks/useProspects.ts` não está a ler `message/details/hint/code` do erro real.
- Resultado: qualquer erro devolvido pela base de dados aparece como `[object Object]`.

O problema técnico mais provável

Há 2 camadas do bug:
1. Erro real da importação está a ser escondido por `mapProspectsError`.
2. A importação em lote (`insert(chunk)`) falha inteira se uma única linha tiver problema:
   - duplicado apanhado pela unique index,
   - valor inválido,
   - payload inesperado no `metadata/raw_row`,
   - ou outro erro de validação.

O que vou corrigir

1. Corrigir o parser de erros
- Atualizar `mapProspectsError()` para suportar erros do cliente da base de dados:
  - `message`
  - `details`
  - `hint`
  - `code`
- Mostrar mensagem legível em vez de `[object Object]`.

2. Isolar o erro real da importação
- No `mutationFn` de `useImportProspects`, separar:
  - erro ao ler prospects existentes,
  - erro ao construir payload,
  - erro ao inserir chunk.
- Assim fica claro em que fase falha.

3. Tornar a importação resiliente
- Manter importação em lote como caminho principal.
- Se um chunk falhar, fazer fallback para inserção mais granular para descobrir e ignorar apenas as linhas problemáticas, em vez de rebentar a importação toda.
- Como escolheste “Ignorar” para duplicados:
  - duplicados passam a contar como `skipped`,
  - não devem bloquear a importação completa.

4. Endurecer normalização dos dados antes do insert
- Garantir normalização consistente de:
  - `email`
  - `nif`
  - `cpe`
  - `company_name`
- Sanitizar `metadata.raw_row` para ficar 100% serializável.

5. Melhorar feedback no modal
- Em vez de fechar logo ao primeiro erro genérico, mostrar resultado claro:
  - importados
  - ignorados
  - falhados
  - primeiro motivo de falha, se existir

O que não vou mexer agora

- Não vou abrir RLS nem relaxar policies.
- Não vou alterar a regra de duplicados para atualizar registos, porque escolheste “Ignorar”.
- Não vou mexer nas policies de `leads` nesta correção, porque isso afeta a distribuição, não a importação inicial.

Ficheiros a ajustar

- `src/hooks/useProspects.ts`
- `src/components/prospects/ImportProspectsDialog.tsx`
- possivelmente `src/components/marketing/import/ImportStep1Upload.tsx` apenas se for preciso reforçar validação do ficheiro

Resultado esperado

- A importação deixa de mostrar `[object Object]`.
- Passas a ver o motivo real do erro.
- Se houver linhas problemáticas ou duplicadas, elas são ignoradas sem bloquear o resto da importação.
- O fluxo fica consistente com a regra de negócio definida para Perfect2Gether.
