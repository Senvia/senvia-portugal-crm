

## Corrigir Cards de Resumo - Manter Valor Total + Novo Card Consumos (Telecom)

### Problema

O card "Valor Total" foi substituido pelos valores de energia, mas o correto e **manter** o "Valor Total" monetario e **acrescentar** um novo card com Consumo (MWh) e kWp.

### Layout Final (Telecom)

```text
+------------------+  +------------------+  +------------------+  +------------------+  +------------------+
| Total Propostas  |  | Valor Total      |  | Consumo / kWp    |  | Em Negociacao    |  | Aceites          |
| 42               |  | 125.000,00 EUR   |  | 245,3 MWh        |  | 8.500,00 EUR     |  | 12               |
|                  |  |                  |  | 128,5 kWp        |  |                  |  |                  |
+------------------+  +------------------+  +------------------+  +------------------+  +------------------+
```

Para nichos nao-telecom, o card "Consumo / kWp" simplesmente nao aparece (grid de 4 cards como hoje).

### Alteracao

**Ficheiro:** `src/pages/Proposals.tsx`

1. Reverter o card "Valor Total" para mostrar sempre o valor monetario (`formatCurrency(totalValue)`)
2. Adicionar um novo card "Consumo / kWp" logo apos o "Valor Total", visivel apenas quando `isTelecom`
3. Ajustar o grid para `grid-cols-2 sm:grid-cols-5` quando telecom, mantendo `grid-cols-2 sm:grid-cols-4` para os restantes

### Secao Tecnica

O hook `useTelecomProposalMetrics` ja existe e continua a ser usado -- apenas muda onde os dados sao renderizados (card proprio em vez de substituir o "Valor Total").

