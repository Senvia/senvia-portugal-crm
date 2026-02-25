

## Problema: Comissão não calcula acima de 1000 kWp

### Causa Raiz

A matriz de comissões de **Solar** usa o método `tiered_kwp`. O último escalão configurado na base de dados é:

```
kwpMin: 500, kwpMax: 1000
```

A função `findTier` (linha 37-38) usa a condição:
```typescript
kwp >= t.kwpMin && kwp < t.kwpMax  // NOTA: kwpMax é EXCLUSIVO
```

Quando o utilizador coloca **kWp = 1000**, o valor não entra em nenhum escalão porque:
- O último tier tem `kwpMax: 1000`, e a condição é `kwp < 1000` (falso para 1000)
- Não existe tier para `kwpMin: 1000`

Resultado: `findTier` retorna `null`, e a comissão fica com o valor do último cálculo válido (872, que é o `baseAas` do tier 100-250 — na verdade é o base do tier 500-1000).

Na imagem: kWp=1000, modelo SAAS → deveria estar no tier 500-1000 (baseAas=3380) mas `1000 < 1000` é falso, então retorna `null`.

### Solução

Alterar a condição de `findTier` para usar `<=` no `kwpMax`, tornando o limite superior **inclusivo**:

```typescript
function findTier(tiers: SolarTier[], kwp: number): SolarTier | null {
  return tiers.find(t => kwp >= t.kwpMin && kwp <= t.kwpMax) ?? null;
}
```

**Problema potencial**: com `<=`, o valor exacto de fronteira (ex: 100) pertenceria a dois tiers (50-100 e 100-250). Para evitar overlap, a melhor abordagem é manter `<` mas tratar o **último tier** como inclusivo, ou simplesmente usar `<=` no max sabendo que o `find` retorna o **primeiro** match (o tier anterior), o que é correcto.

Na verdade, analisando os tiers:
- 0 → 1.2, 1.2 → 4.1, 4.1 → 15, 15 → 25, 25 → 50, 50 → 100, 100 → 250, 250 → 500, 500 → 1000

Com `<=`, o valor 1.2 cairia no tier 0-1.2 (primeiro match via `find`), o que é correcto. Valor 1000 cairia no tier 500-1000, correcto. Não há problema de overlap porque `find` retorna o primeiro match.

Alternativamente, melhor ainda: para o **último tier**, estender o `kwpMax` para `Infinity`. Mas isso requer alterar os dados na DB. A solução mais simples e menos intrusiva é mudar `<` para `<=`.

### Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Linha 38: mudar `kwp < t.kwpMax` para `kwp <= t.kwpMax` |

### Detalhe Técnico

- A função `Array.find` retorna o **primeiro** elemento que satisfaz a condição
- Com `<=`, valores de fronteira (ex: 100) pertencem ao tier anterior (50-100), pois aparece primeiro no array — comportamento correcto
- Para valores acima de 1000 (último tier), continuará a retornar `null` — o que é expectável pois não existe configuração para esse intervalo
- Se no futuro quiserem suportar valores acima de 1000, basta adicionar um novo tier na configuração

