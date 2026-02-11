

## Integrar Consumos nos Cards Existentes (Telecom)

### Resumo

Em vez de um card separado para consumos, os valores de energia sao integrados diretamente nos cards **"Valor Total"** e **"Em Negociacao"**, apenas para o nicho telecom.

### Layout Final (Telecom)

```text
+------------------+  +-------------------------+  +-------------------------+  +------------------+
| Total Propostas  |  | Valor Total             |  | Em Negociacao           |  | Aceites          |
| 42               |  | 125.000,00 EUR          |  | 8.500,00 EUR            |  | 12               |
|                  |  | 245,3 MWh | 128,5 kWp   |  | 102,1 MWh | 45,0 kWp   |  |                  |
+------------------+  +-------------------------+  +-------------------------+  +------------------+
```

Para nichos nao-telecom, os cards ficam exatamente como estao (sem linhas de MWh/kWp).

### Alteracoes

**Ficheiro:** `src/pages/Proposals.tsx`

1. Remover o card separado "Consumo / kWp" e reverter o grid para `sm:grid-cols-4` (sempre 4 cards)
2. No card "Valor Total": adicionar linha secundaria com MWh e kWp totais (quando telecom)
3. No card "Em Negociacao": adicionar linha secundaria com MWh e kWp filtrados apenas por propostas com status `sent` ou `negotiating`

**Ficheiro:** `src/hooks/useTelecomProposalMetrics.ts`

4. Expandir o hook para tambem retornar as metricas filtradas por propostas em negociacao (`pendingMWh`, `pendingKWp`), adicionando queries com filtro de status `in ('sent', 'negotiating')`

### Secao Tecnica

**Hook atualizado** retorna:
- `totalMWh`, `totalKWp` -- todas as propostas (para o card Valor Total)
- `pendingMWh`, `pendingKWp` -- apenas propostas com status `sent` ou `negotiating` (para o card Em Negociacao)

**Renderizacao condicional** nos dois cards:
```
{isTelecom && (
  <p className="text-xs text-muted-foreground mt-1">
    {totalMWh.toFixed(1)} MWh · {totalKWp.toFixed(1)} kWp
  </p>
)}
```

