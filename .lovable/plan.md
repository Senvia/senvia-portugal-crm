

## Adicionar selector de status no modal "Nova Venda"

### Problema

O modal "Nova Venda" nao tem campo para escolher o status da venda. O status e sempre `pending` (hardcoded no hook `useCreateSale`, linha 98 de `useSales.ts`).

### Solucao

Adicionar um campo Select para o status da venda no modal de criacao, e passar esse valor para a mutation.

### Alteracoes

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

1. Adicionar state: `const [saleStatus, setSaleStatus] = useState<SaleStatus>("pending")`
2. Importar `SALE_STATUS_LABELS`, `SALE_STATUSES`, `SaleStatus` de `@/types/sales` (alguns ja estao importados)
3. Adicionar um campo Select na secao de informacao basica (junto ao campo de data e metodo de pagamento) com as opcoes de status
4. Passar `status: saleStatus` no objecto enviado ao `createSale.mutateAsync`
5. Reset do `saleStatus` para `"pending"` quando o modal abre

**Ficheiro: `src/hooks/useSales.ts`**

1. Adicionar `status?: SaleStatus` ao tipo do `mutationFn`
2. Usar `data.status || "pending"` em vez do hardcoded `"pending"` na linha 98

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Adicionar campo Select para status da venda + passar ao mutation |
| `src/hooks/useSales.ts` | Aceitar `status` como parametro opcional na mutation |

