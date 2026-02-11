

## Taxa IVA por Produto/Serviço

### Problema
Atualmente, todos os itens da fatura usam a taxa IVA global da organizacao (`tax_config`). Se um produto e isento e outro tem 23%, nao ha forma de distinguir -- todos levam a mesma taxa.

### Solucao
Adicionar campos `tax_value` e `tax_exemption_reason` a cada produto. Quando a fatura e gerada, a edge function usa a taxa do produto em vez da taxa global.

### Alteracoes

**1. Migracao de base de dados (tabela `products`)**
- Adicionar coluna `tax_value NUMERIC DEFAULT NULL` (null = usar taxa global da org)
- Adicionar coluna `tax_exemption_reason TEXT DEFAULT NULL`

**2. Tipo `Product` (`src/types/proposals.ts`)**
- Adicionar `tax_value?: number | null` e `tax_exemption_reason?: string | null`

**3. Modal de criacao (`src/components/settings/CreateProductModal.tsx`)**
- Adicionar Select com opcoes: "Usar taxa da organizacao (padrao)", "IVA 23%", "IVA 6%", "IVA 13%", "Isento (0%)"
- Quando "Isento" e selecionado, mostrar campo para motivo de isencao (ex: M10)
- Guardar `tax_value` e `tax_exemption_reason` no produto

**4. Modal de edicao (`src/components/settings/EditProductModal.tsx`)**
- Mesmo campo Select para taxa IVA
- Pre-preencher com os valores existentes do produto

**5. Hook `useProducts` (`src/hooks/useProducts.ts`)**
- Adicionar `tax_value` e `tax_exemption_reason` ao `useCreateProduct` e `useUpdateProduct`

**6. Listagem de produtos (`src/components/settings/ProductsTab.tsx`)**
- Mostrar badge com taxa IVA ao lado do preco (ex: "23%", "Isento", "Org default")

**7. Edge function `issue-invoice` (`supabase/functions/issue-invoice/index.ts`)**
- No fluxo legacy (sale_items), fazer JOIN com tabela products para obter `tax_value` e `tax_exemption_reason`
- Se o produto tem `tax_value` definido, usar essa taxa; senao, usar a taxa global da org
- Alterar `buildItem` para aceitar taxa por item

**8. Modal de rascunho (`src/components/sales/InvoiceDraftModal.tsx`)**
- Se pagamento individual, mostrar a taxa global (comportamento atual)
- Se venda completa com items, mostrar a taxa de cada item

### Detalhes tecnicos

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | `ALTER TABLE products ADD COLUMN tax_value NUMERIC DEFAULT NULL, ADD COLUMN tax_exemption_reason TEXT DEFAULT NULL` |
| `src/types/proposals.ts` | Adicionar campos ao `Product` interface |
| `src/components/settings/CreateProductModal.tsx` | Campo Select para taxa IVA + campo motivo isencao |
| `src/components/settings/EditProductModal.tsx` | Mesmo campo Select pre-preenchido |
| `src/hooks/useProducts.ts` | Incluir novos campos nas mutations |
| `src/components/settings/ProductsTab.tsx` | Badge com taxa IVA na listagem |
| `supabase/functions/issue-invoice/index.ts` | Ler taxa do produto via JOIN; usar por item |
| `src/components/sales/InvoiceDraftModal.tsx` | Mostrar taxa por item quando aplicavel |

### Logica da taxa por item na edge function

```text
Para cada sale_item:
  1. Se sale_item.product_id existe E product.tax_value != null:
     -> Usar product.tax_value e product.tax_exemption_reason
  2. Senao:
     -> Usar org.tax_config (taxa global)
```

### Opcoes de IVA no Select

| Label | tax_value | tax_exemption_reason |
|---|---|---|
| Usar taxa da organizacao | null | null |
| IVA 23% | 23 | null |
| IVA 13% (Intermédia) | 13 | null |
| IVA 6% (Reduzida) | 6 | null |
| Isento (0%) | 0 | (campo obrigatorio) |

