

## Diagnóstico

O módulo de comissões usa a query key `['commissions-live', ...]`. Quando uma venda é criada, atualizada ou eliminada em `useSales.ts`, essa query **nunca é invalidada** — por isso os dados de comissões ficam em cache e não mostram a nova venda.

## Correção

### Ficheiro: `src/hooks/useSales.ts`

Adicionar `queryClient.invalidateQueries({ queryKey: ["commissions-live"] })` nos callbacks `onSuccess` de **todas as 5 mutations**:

1. **`useCreateSale`** (linha 127) — após criar venda
2. **`useCreateSaleFromProposal`** (linha 180) — após aceitar proposta
3. **`useUpdateSaleStatus`** (linha 205) — após mudar estado (ex: para "delivered")
4. **`useUpdateSale`** (linha 265) — após editar venda
5. **`useDeleteSale`** (linha 284) — após eliminar venda

Apenas 5 linhas adicionadas, 1 ficheiro editado. Sem alterações de lógica.

