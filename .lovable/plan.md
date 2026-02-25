

## Corrigir Comissao acima de 1000 kWp (Teto no ultimo escalao)

### Problema

Os tiers de Solar na base de dados vao de 0 ate 1000. Quando o utilizador coloca kWp=1500, `findTier` retorna `null` porque nenhum tier inclui 1500. A comissao fica "presa" no ultimo valor calculado (ex: 1172 quando digitou 150 antes de 1500).

O `findTier` com `<=` resolveu o caso exacto de 1000, mas valores **acima** de 1000 continuam sem tier.

### Solucao

No calculo `tiered_kwp` em `useCommissionMatrix.ts`, quando `findTier` retorna `null`, verificar se o kWp excede o maximo de todos os tiers. Se sim, usar o ultimo tier com o kWp limitado ao `kwpMax` desse tier (teto).

### Alteracao

**Ficheiro: `src/hooks/useCommissionMatrix.ts`**

Alterar o case `tiered_kwp` (linhas 55-63):

```typescript
case 'tiered_kwp': {
  const kwp = detail.kwp;
  if (kwp == null || !rule.tiers?.length) return null;
  let tier = findTier(rule.tiers, kwp);
  let effectiveKwp = kwp;
  // Cap: se kWp excede todos os escaloes, usar ultimo tier com teto
  if (!tier) {
    const lastTier = rule.tiers[rule.tiers.length - 1];
    if (kwp > lastTier.kwpMax) {
      tier = lastTier;
      effectiveKwp = lastTier.kwpMax;
    }
  }
  if (!tier) return null;
  const base = isAas ? tier.baseAas : tier.baseTransaccional;
  const adic = isAas ? tier.adicAas : tier.adicTransaccional;
  return base + (effectiveKwp - tier.kwpMin) * adic;
}
```

Isto garante que para kWp=1500, a comissao sera a mesma que para kWp=1000 (o maximo do tier 500-1000).

### Ficheiros

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Adicionar logica de teto no ultimo escalao quando kWp excede todos os tiers |

