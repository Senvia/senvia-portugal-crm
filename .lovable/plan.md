

## Corrigir erro de importação de chargebacks + melhorar lógica

### Problema identificado
1. **Erro de importação**: O toast genérico "Erro ao importar chargebacks" aparece porque o erro do Supabase (que não é instância de `Error`) cai no fallback do catch. O erro real está escondido. Provavelmente é um problema com o tamanho do payload JSONB enviado ao RPC ou com a coluna de valor não ser detetada corretamente.

2. **Lógica a melhorar**: O utilizador quer que ao importar o ficheiro, os dados sejam guardados na Análise de Comissões e depois o sistema faça o match com as vendas existentes (fluxo atual já faz isso, mas pode estar a falhar no RPC).

### Plano de alterações

**1. Melhorar tratamento de erros (`ImportChargebacksDialog.tsx`)**
- No catch do `handleImport`, extrair a mensagem real do erro Supabase (`error.message` ou `error.details`)
- Adicionar log do erro para debugging futuro

**2. Corrigir warning de ref no Select (`ImportChargebacksDialog.tsx`)**
- O `forwardRef` está a passar `ref` ao `DialogContent`, mas o componente `Select` interno gera um warning. Remover o `forwardRef` wrapper desnecessário (o dialog não precisa de ref externo).

**3. Tornar a coluna de valor selecionável manualmente (`ImportChargebacksDialog.tsx`)**
- Atualmente a coluna de valor (chargeback_amount) é detetada automaticamente e não pode ser alterada manualmente
- Se a auto-deteção falha (nenhuma coluna com "chargeback", "valor", etc.), a importação fica bloqueada
- Adicionar um `Select` para a coluna de valor, pré-selecionada com a auto-deteção mas editável

**4. Reduzir payload do RPC (`useCommissionAnalysis.ts`)**
- O `preparedRows` envia TODAS as colunas do ficheiro como `raw_row` para o RPC
- Ficheiros grandes com muitas colunas podem exceder limites do PostgREST
- Limitar o payload a apenas `cpe` e `chargeback_amount` por linha, removendo colunas extra desnecessárias

**5. Adicionar validação antes de enviar**
- Validar que os valores de chargeback são numéricos parseáveis
- Filtrar linhas vazias (sem CPE e sem valor)

### Ficheiros a alterar
- `src/components/finance/ImportChargebacksDialog.tsx` — corrigir ref, melhorar erro, adicionar select de coluna valor
- `src/hooks/useCommissionAnalysis.ts` — reduzir payload, melhorar extração de erro

