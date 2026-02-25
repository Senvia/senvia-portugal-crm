

## Correcao — Campo nao aceita o valor 0

### Problema

Nos campos numericos dos escaloes (e outros campos da matriz), o codigo usa:

```typescript
value={value || ''}
```

Em JavaScript, `0 || ''` resulta em `''` porque `0` e considerado falsy. Ou seja, quando o utilizador escreve `0`, o campo fica vazio imediatamente.

### Solucao

Substituir `||` por `??` (nullish coalescing) em todos os campos numericos do `CommissionMatrixTab.tsx`:

```typescript
// Antes (bug):
value={value || ''}

// Depois (correto):
value={value ?? ''}
```

O operador `??` so converte para `''` quando o valor e `null` ou `undefined`, mantendo o `0` visivel.

### Ficheiros a alterar

**`src/components/settings/CommissionMatrixTab.tsx`**

- `TierField`: `value={value || ''}` → `value={value ?? ''}`
- `ProductRuleEditor` — campo Base: `value={rule.base || ''}` → `value={rule.base ?? ''}`
- `ProductRuleEditor` — campo ratePerKwp: `value={rule.ratePerKwp || ''}` → `value={rule.ratePerKwp ?? ''}`
- `ProductRuleEditor` — campo rate (percentage, per_kwp, fixed): `value={rule.rate || ''}` → `value={rule.rate ?? ''}`

Total: ~6 substituicoes simples de `||` para `??`.

