

## Problema

A função `getRoundedChartMax` calcula o teto do eixo Y com base no valor mais alto dos dados. Com o valor máximo de 766,26€, o cálculo atual resulta em ~900 (766,26 × 1,12 = 858 → arredonda para 900). O utilizador espera que o eixo vá até **1.000€** — um número redondo mais natural.

## Solução

Ajustar a lógica de `getRoundedChartMax` em `MiniBarChart.tsx` para arredondar de forma mais agressiva para números "bonitos" (100, 250, 500, 1000, 2000, 5000, etc.):

- Aumentar o headroom de 12% para ~30% (`highestValue * 1.3`) para valores maiores
- Ajustar os `stepFactor` para produzir saltos mais redondos:
  - Valores até 1000 → arredondar para o próximo múltiplo de 100 ou 250
  - Valores até 5000 → múltiplos de 500
  - Valores maiores → múltiplos de 1000

Com 766,26 × 1,3 = 996 → arredondado para **1.000** — exatamente o que se espera.

## Arquivo

- `src/components/dashboard/MiniBarChart.tsx` — apenas a função `getRoundedChartMax` (linhas 61-91)

