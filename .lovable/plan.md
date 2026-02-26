

## Verificação: Cálculos de Comissão de Energia nas Propostas/CPEs

### Problema Encontrado

O `ProposalCpeSelector` chama **sempre** `calculateEnergyCommission(margem, 'mid')` — hardcoded no tier `mid` (301-600 MWh). Isto significa que **independentemente do consumo anual do CPE**, a comissão é sempre calculada usando a coluna 301-600 MWh.

Exemplo: Um CPE com consumo de 150 MWh (deveria usar coluna 0-300 MWh / tier `low`) está a ser calculado como se fosse 301-600 MWh.

### Solução

**Ficheiro:** `src/hooks/useCommissionMatrix.ts`
- Criar uma função utilitária `getVolumeTier(consumoAnualKwh: number): EnergyVolumeTier` que mapeia:
  - 0–300.000 kWh (0–300 MWh) → `'low'`
  - 300.001–600.000 kWh (301–600 MWh) → `'mid'`
  - 600.001+ kWh (601+ MWh) → `'high'`
- Exportar esta função do hook

**Ficheiro:** `src/components/proposals/ProposalCpeSelector.tsx`
- Importar `getVolumeTier` (ou equivalente do hook)
- Em todas as 3 chamadas a `calculateEnergyCommission(margem, 'mid')`, substituir `'mid'` pelo tier correcto baseado no `consumo_anual` do CPE:
  - Linha 78: `calculateEnergyCommission(margem, getVolumeTier(parseFloat(updateConsumoAnual)))`
  - Linha 177: `calculateEnergyCommission(margem, getVolumeTier(parseFloat(updated.consumo_anual)))`
  - Linha 203: `calculateEnergyCommission(margem, getVolumeTier(parseFloat(updated.consumo_anual)))`

### Nota sobre Unidades
O `consumo_anual` no formulário está em **kWh** (ex: 15000), mas os tiers são em **MWh** (300 MWh = 300.000 kWh). A função de conversão precisa dividir por 1000 para converter kWh → MWh antes de comparar com os limiares.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Adicionar função `getVolumeTier()` |
| `src/components/proposals/ProposalCpeSelector.tsx` | Usar tier dinâmico baseado no consumo anual |

