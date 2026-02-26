

## Problema: Regras de derivação não aplicadas no cálculo

### Situação Actual
A função `calculateEnergyCommissionPure` lê **directamente** os valores armazenados nas bandas (`ponderadorLow`, `valorLow`, `ponderadorHigh`, `valorHigh`). As regras de derivação (`tierRules`) só são aplicadas no editor UI (CommissionMatrixTab) quando o utilizador edita um valor.

Isto significa que:
- Se o utilizador importa dados via Excel só com a coluna de referência (mid), as colunas low/high ficam com **0**
- Se o utilizador muda as regras de derivação depois de guardar, os valores antigos **não são recalculados**
- O cálculo em runtime ignora completamente as `tierRules`

### Solução
Aplicar as regras de derivação **em runtime** na função `calculateEnergyCommissionPure`, para que o cálculo seja sempre consistente com as regras configuradas.

### Alteração

**Ficheiro:** `src/hooks/useCommissionMatrix.ts`

Na função `calculateEnergyCommissionPure`:
1. Receber também as `tierRules` do config (já existe no `EnergyCommissionConfig`)
2. Se o tier pedido **não** é a coluna de referência, aplicar a regra de derivação ao valor da coluna fonte:
   - Identificar de qual coluna (low/mid/high) o tier actual deriva (`rule.source`)
   - Ler os valores da coluna fonte na banda
   - Aplicar a operação (`multiply`, `divide`, `none`) com o valor da regra
3. Usar os valores derivados em runtime em vez dos valores armazenados

```text
Fluxo actual:
  tier=low → lê band.ponderadorLow, band.valorLow (pode ser 0 ou stale)

Fluxo corrigido:
  tier=low → rule.source=from_mid → lê band.ponderador, band.valor → aplica ÷1.33
```

Isto garante que mesmo que os valores armazenados estejam desactualizados, o cálculo reflecte sempre as regras de derivação actuais.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Aplicar tierRules no cálculo runtime de `calculateEnergyCommissionPure` |

