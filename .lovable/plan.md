

## Plano: Simplificar Produtos Telecom (Serviços)

### O que o utilizador quer
Os produtos telecom devem funcionar como um **catálogo simples**: nome, preço base, se tem comissão e a percentagem. Na hora da venda/proposta, os dados são **copiados** do catálogo e podem ser **editados livremente** sem alterar o produto original.

### O que existe hoje (e está errado)
- Sistema complexo de "campos por produto" (duração, valor, kWp, comissão) guardado como JSONB na organização (`servicos_products_config`)
- `ServicosProductsManager` com checkboxes de campos — confuso e não intuitivo
- `servicos_details` JSONB nas propostas/vendas com sub-campos por produto
- Hook `useServicosProducts` que lê da config JSONB

### Solução

**1. Reformular o `ServicosProductsManager`**
- Remover o sistema de checkboxes de campos (duracao, valor, kwp, comissao)
- Cada produto passa a ter: **Nome**, **Preço Base (€)**, **Tem Comissão (sim/não)**, **% Comissão**
- Novo formato JSONB na `servicos_products_config`:
```json
[
  { "name": "Internet Fibra", "price": 59, "has_commission": true, "commission_pct": 10 },
  { "name": "NOS TV", "price": 39, "has_commission": false, "commission_pct": 0 }
]
```

**2. Atualizar `useServicosProducts` hook**
- Retornar a nova estrutura (nome, preço, comissão)
- Manter fallback para os hardcoded antigos (Perfect2Gether não é afetada)

**3. Reformular a UI de seleção de serviços nas Propostas/Vendas**
- Ao selecionar um produto do catálogo, os campos são **pré-preenchidos** (nome, preço, comissão)
- O utilizador pode **editar nome, preço e comissão** diretamente na proposta/venda
- As edições são guardadas no `servicos_details` JSONB da proposta/venda, **sem alterar o catálogo**
- Estrutura: cada entrada no `servicos_details` passa a ter: `{ name: string, price: number, commission_pct: number, commission_value: number }`

**4. Ficheiros a alterar**

| Ficheiro | Mudança |
|---|---|
| `ServicosProductsManager.tsx` | Reformular UI: nome, preço, comissão toggle + % |
| `useServicosProducts.ts` | Adaptar ao novo formato JSONB |
| `CreateProposalModal.tsx` | Produtos copiados e editáveis inline |
| `EditProposalModal.tsx` | Idem |
| `CreateSaleModal.tsx` | Idem — valores da proposta são copiados e editáveis |
| `EditSaleModal.tsx` | Idem |
| `ProposalDetailsModal.tsx` | Exibir dados editados |
| `SaleDetailsModal.tsx` | Idem |
| `types/proposals.ts` | Atualizar tipos `ServicosProductDetail` e `ServicosProductConfig` |

**5. Impacto na Perfect2Gether**
Zero. Se `servicos_products_config` é `NULL`, o hook continua a usar os hardcoded existentes com o formato antigo. Os componentes detetam o formato e adaptam-se.

