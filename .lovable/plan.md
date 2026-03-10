

## Plano: Produtos de Serviços por Organização (sem afetar ninguém)

### Abordagem
Guardar a lista de produtos de serviços como JSONB na tabela `organizations`. Organizações que não configurarem nada (Perfect2Gether) continuam a usar os 5 produtos hardcoded. Escolha Inteligente configura os seus.

### Alterações

**1. Migração DB**
- Nova coluna `servicos_products_config JSONB DEFAULT NULL` na tabela `organizations`
- Quando `NULL` → usa fallback hardcoded (Solar, Baterias, etc.)
- Quando preenchido → usa a lista personalizada

Estrutura:
```json
[
  { "name": "MEO Fibra", "fields": ["valor", "comissao"] },
  { "name": "NOS TV", "fields": ["valor", "duracao", "comissao"] },
  { "name": "Solar", "fields": ["duracao", "kwp", "comissao"] }
]
```

**2. Hook `useServicosProducts` (novo)**
- Lê `servicos_products_config` da organização via `useOrganization()`
- Se `null` → retorna `SERVICOS_PRODUCTS` e `SERVICOS_PRODUCT_CONFIGS` hardcoded
- Se preenchido → retorna a lista personalizada
- Zero impacto em quem não configurar

**3. UI — nova secção em Definições → Produtos (apenas telecom)**
- Secção "Produtos Telecom" abaixo da lista de produtos existente
- Adicionar/remover produtos com nome e campos relevantes (duração, valor, kWp, comissão)
- Visível apenas para `niche === 'telecom'`

**4. Substituir constantes nos consumidores**

| Ficheiro | Mudança |
|---|---|
| `CreateProposalModal.tsx` | `SERVICOS_PRODUCTS`/`SERVICOS_PRODUCT_CONFIGS` → hook |
| `EditProposalModal.tsx` | Idem |
| `ProposalDetailsModal.tsx` | Idem |
| `CreateSaleModal.tsx` | Idem |
| `EditSaleModal.tsx` | Idem |
| `SaleDetailsModal.tsx` | Idem |
| `CommissionMatrixTab.tsx` | Idem |
| `proposal-servicos-validation.ts` | Receber configs como parâmetro |

### Impacto na Perfect2Gether
**Zero.** A coluna será `NULL` por default, e o hook faz fallback para as constantes hardcoded existentes. Nenhum comportamento muda.

