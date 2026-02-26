

## Plano: Tornar todas as colunas editáveis (300 MWh e 601 MWh)

### Problema actual
As colunas 300 MWh e 601 MWh são derivadas automaticamente (÷1.33 e ×1.5) e mostradas como read-only. O utilizador quer que todos os 6 valores (Ponderador + Valor × 3 faixas) sejam editáveis independentemente.

### Alterações

#### 1. Alterar o tipo `EnergyMarginBand`
**Ficheiro:** `src/hooks/useCommissionMatrix.ts`

Expandir de 2 campos (referência) para 6 campos independentes:
```typescript
export interface EnergyMarginBand {
  marginMin: number;
  ponderadorLow: number;   // 300 MWh
  valorLow: number;
  ponderador: number;      // 301-600 MWh (referência)
  valor: number;
  ponderadorHigh: number;  // 601 MWh
  valorHigh: number;
}
```

Atualizar `calculateEnergyCommissionPure` para aceitar o tier e usar o ponderador/valor correto conforme a faixa.

#### 2. Atualizar tabela no editor
**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`

- Substituir as 4 células read-only (300 MWh e 601 MWh) por `DecimalInput` editáveis
- Remover a função `deriveValue` e a secção "Multiplicadores de Volume" (já não são necessários)
- Atualizar `DEFAULT_ENERGY_BANDS` para incluir os 6 valores por banda
- Remover as classes `text-muted-foreground` das colunas laterais (já não são derivadas)
- Atualizar a descrição do modal e a fórmula preview
- Atualizar importação Excel para mapear 7 colunas (marginMin + 6 valores)

#### 3. Atualizar defaults com todos os valores
Usando a fórmula original para pré-calcular os defaults:
- 300 MWh: `ponderador ÷ 1.33`, `valor ÷ 1.33`
- 601 MWh: `ponderador × 1.5`, `valor × 1.5`

#### 4. Remover `volumeMultipliers` do config
Já não são necessários pois cada faixa tem valores independentes. Limpar referências no hook e no modal.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Expandir `EnergyMarginBand`, remover `volumeMultipliers`, atualizar cálculo |
| `src/components/settings/CommissionMatrixTab.tsx` | Todos os inputs editáveis, remover derivação, atualizar defaults |

