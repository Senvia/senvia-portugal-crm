

## Usar o volume GLOBAL do mês para determinar o tier de comissões (não por comercial)

### Problema atual
Hoje, cada comercial tem o seu próprio tier calculado com base no volume individual dele (linha 218 do `useLiveCommissions.ts`):
```ts
entry.tier = getVolumeTier(entry.totalConsumoKwh); // tier individual
```
Depois, a comissão de cada CPE usa esse tier individual (linha 227):
```ts
calculateEnergyCommissionPure(cpe.margem, energyConfig, entry.tier)
```

### O que deve acontecer
O tier deve ser determinado pelo **total global de todas as vendas do mês**, não por comercial. Se o total do mês = 700 MWh → tier = 'high' → **todas** as comissões de **todos** os comerciais usam a tabela 'high'.

### Solução

**Ficheiro: `src/hooks/useLiveCommissions.ts`** (linhas 215-228)

1. Calcular `globalTier` primeiro (já é feito na linha 213)
2. No loop de recálculo (linha 216-238), substituir `entry.tier` pelo `globalTier`:
   - Linha 218: `entry.tier = globalTier` (em vez de `getVolumeTier(entry.totalConsumoKwh)`)
   - Linha 227: `calculateEnergyCommissionPure(cpe.margem, energyConfig, globalTier)` (em vez de `entry.tier`)
3. Manter `entry.totalConsumoKwh/Mwh` para informação, mas o tier usado no cálculo passa a ser o global

**Ficheiro: `src/components/sales/EditSaleModal.tsx`** (recálculo inline nos onChange)

- Nos onChange de consumo/margem, o recálculo usa `getVolumeTier` do consumo individual. Isto é aceitável no contexto de edição de uma venda isolada (não temos o volume global no modal). Nenhuma alteração necessária aqui — o valor final será recalculado pelo `useLiveCommissions` ao gravar.

### Resultado
- Todas as comissões do mês escalam juntas com o volume total
- Ao atingir 301 MWh global → todas passam para 'mid'
- Ao atingir 601 MWh global → todas passam para 'high'

### Ficheiros alterados
- `src/hooks/useLiveCommissions.ts` — 2 linhas alteradas

