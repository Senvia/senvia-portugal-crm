

## Redesign da Pagina de Plano e Faturacao - Layout Full-Width + Alteracoes de Planos

### Resumo
Mudar o layout de 3 colunas lado a lado para seccoes de largura total empilhadas verticalmente (Starter em cima, Pro no meio, Elite em baixo). Alem disso, adicionar Meta Pixels ao Starter e Stripe ao Elite, tanto na UI como no backend (tabela `subscription_plans`).

### Alteracoes

#### 1. Layout Full-Width (`src/components/settings/BillingTab.tsx`)

Substituir o grid de 3 colunas por seccoes verticais de largura total:
- Cada plano ocupa a largura toda do ecra
- Header horizontal com nome, preco e badge lado a lado (em desktop)
- Modulos, Integracoes e Limites dispostos em colunas horizontais dentro de cada seccao (grid de 3 colunas em desktop, empilhado em mobile)
- Separador visual entre cada plano
- Botao de acao alinhado no header de cada seccao

#### 2. Alteracoes nos Planos (`src/lib/stripe-plans.ts`)

**Starter**: Adicionar "Meta Pixels" a lista de integracoes

**Elite**: Adicionar "Stripe (Pagamentos)" a lista de integracoes

#### 3. Atualizar Backend - Tabela `subscription_plans` (Migracao SQL)

**Starter**: Alterar `features.integrations.meta_pixels` de `false` para `true`

**Elite**: Adicionar nova chave `features.integrations.stripe` com valor `true`

Pro e Elite tambem precisam de ter `stripe: false` e `stripe: true` respetivamente para consistencia.

#### 4. Atualizar Hook de Subscricao (`src/hooks/useSubscription.ts`)

Adicionar `'stripe'` ao tipo `IntegrationKey`:
```
type IntegrationKey = 'whatsapp' | 'invoicing' | 'meta_pixels' | 'stripe';
```

Atualizar o `DEFAULT_PLAN` para incluir `stripe: false` no objeto de integracoes.

#### 5. Adicionar icone do Stripe (`src/components/settings/BillingTab.tsx`)

Adicionar mapeamento de icone para "Stripe (Pagamentos)" no `INTEGRATION_ICONS` (usar icone `CreditCard` do lucide-react).

---

### Detalhes Tecnicos

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/settings/BillingTab.tsx` | Layout full-width vertical, adicionar icone Stripe |
| `src/lib/stripe-plans.ts` | Meta Pixels no Starter, Stripe no Elite |
| `src/hooks/useSubscription.ts` | Adicionar `stripe` ao IntegrationKey e DEFAULT_PLAN |
| Migracao SQL | Atualizar JSONB features nos planos starter, pro e elite |

**Migracao SQL prevista:**
```sql
-- Starter: ativar meta_pixels, adicionar stripe=false
UPDATE subscription_plans
SET features = jsonb_set(
  jsonb_set(features, '{integrations,meta_pixels}', 'true'),
  '{integrations,stripe}', 'false'
)
WHERE id = 'starter';

-- Pro: adicionar stripe=false
UPDATE subscription_plans
SET features = jsonb_set(features, '{integrations,stripe}', 'false')
WHERE id = 'pro';

-- Elite: adicionar stripe=true
UPDATE subscription_plans
SET features = jsonb_set(features, '{integrations,stripe}', 'true')
WHERE id = 'elite';
```

