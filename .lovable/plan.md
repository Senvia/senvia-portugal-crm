

## Plano: Auto-derivar 300 MWh e 601+ MWh a partir da referência

### Contexto
Todos os campos já são editáveis. Falta adicionar a lógica de **auto-preenchimento**: quando o utilizador altera os valores da coluna 301-600 MWh (referência), os valores das colunas 300 MWh e 601+ MWh devem ser recalculados automaticamente (÷1.33 e ×1.5). Se o utilizador editar diretamente as colunas 300 ou 601+, o valor manual é mantido.

### Alteração

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`

- Atualizar `updateBand` dentro de `EnergyModal`:
  - Quando o campo editado é `ponderador` → recalcular `ponderadorLow` (÷1.33) e `ponderadorHigh` (×1.5)
  - Quando o campo editado é `valor` → recalcular `valorLow` (÷1.33) e `valorHigh` (×1.5)
  - Quando o campo editado é qualquer outro (`marginMin`, `ponderadorLow`, `valorLow`, `ponderadorHigh`, `valorHigh`) → atualizar apenas o campo editado (override manual)

Nenhum outro ficheiro afetado. A lógica de cálculo no hook já usa os campos independentes por tier.

