## Produtos de Serviços Configuráveis por Organização

### Estado: ✅ Implementado

### Alterações Realizadas

**1. Migração DB**
- Nova coluna `servicos_products_config JSONB DEFAULT NULL` na tabela `organizations`
- Quando `NULL` → fallback para constantes hardcoded (Solar, Baterias, etc.)
- Quando preenchido → lista personalizada da organização

**2. Hook `useServicosProducts` (`src/hooks/useServicosProducts.ts`)**
- Lê `servicos_products_config` da organização via `useOrganization()`
- Retorna `{ products, configs }` com fallback automático

**3. UI — `ServicosProductsManager` (`src/components/settings/ServicosProductsManager.tsx`)**
- Secção "Produtos Telecom" em Definições → Produtos (apenas `niche === 'telecom'`)
- Adicionar/remover produtos com seleção de campos (duração, valor, kWp, comissão)

**4. Componentes atualizados (constantes → hook):**

| Ficheiro | Mudança |
|---|---|
| `CreateProposalModal.tsx` | `useServicosProducts()` substitui imports hardcoded |
| `EditProposalModal.tsx` | Idem |
| `ProposalDetailsModal.tsx` | Idem |
| `EditSaleModal.tsx` | Idem |
| `CommissionMatrixTab.tsx` | Idem |
| `proposal-servicos-validation.ts` | Aceita `configs` como parâmetro opcional |

**5. Impacto na Perfect2Gether**
**Zero.** Coluna `NULL` por default → fallback para constantes hardcoded.
