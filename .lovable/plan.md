
# Corrigir Classificacao de Organizacoes em Trial no Painel Super Admin

## Problema
A Construpao tem `plan: "elite"` na base de dados porque a edge function `check-subscription` grava `plan = 'elite'` durante o trial para dar acesso total. Mas a logica do painel Super Admin verifica o plano ANTES de verificar o trial, classificando-a incorretamente como "Pago".

## Causa Raiz
Na funcao `getOrgStatus` e no `AdminMetricsCards`, a ordem de verificacao esta errada:

```text
Atual (errado):
1. billing_exempt? -> "exempt"
2. plan != basic?  -> "paying"   <-- Construpao cai aqui (plan=elite)
3. trial ativo?    -> "trial"

Correto:
1. billing_exempt? -> "exempt"
2. trial ativo?    -> "trial"    <-- Construpao deve cair aqui
3. plan != basic?  -> "paying"
```

## Solucao

### Ficheiros a alterar

**1. `src/components/system-admin/OrganizationsTable.tsx`**

Corrigir a funcao `getOrgStatus` para verificar trial ANTES do plano:

```typescript
function getOrgStatus(org: Organization) {
  const now = new Date();
  if (org.billing_exempt) return "exempt";
  // Trial ativo: tem data de trial no futuro E nao tem subscricao Stripe real
  // (orgs com subscricao real nao tem trial_ends_at ou ja expirou)
  if (org.trial_ends_at && new Date(org.trial_ends_at) > now) return "trial";
  if (org.plan && org.plan !== "basic") return "paying";
  return "expired";
}
```

**2. `src/components/system-admin/AdminMetricsCards.tsx`**

Aplicar a mesma logica corrigida nos filtros de contagem:

- **MRR**: Excluir orgs em trial (com `trial_ends_at` no futuro)
- **Pagantes**: Excluir orgs em trial
- **Em Trial**: Verificar apenas `trial_ends_at > now` (independente do `plan`)

## Resultado
- Construpao aparecera como "Trial" com badge azul e "14d restantes"
- MRR nao incluira os 147EUR falsos da Construpao
- Contagem de pagantes sera 0 (so existem isentos e trial)
