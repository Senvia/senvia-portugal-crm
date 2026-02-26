

## Problema: Campos desalinhados na secção de energia do CPE

A label "Consumo Anual (kWh)" ocupa duas linhas enquanto "Duração (anos)", "DBL (€/MWh)" e "Margem (€)" cabem numa só linha. Isto empurra o input do Consumo Anual para baixo, desalinhando os campos.

### Solução

**Ficheiro:** `src/components/proposals/ProposalCpeSelector.tsx`

Na grid de campos de energia (linha ~299), adicionar `items-end` ao contentor `grid` para que todos os inputs se alinhem pelo fundo, independentemente da altura das labels:

```diff
- <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
+ <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 items-end">
```

Isto alinha os 4 campos (Consumo Anual, Duração, DBL, Margem) pela base, resolvendo o desalinhamento visual.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/components/proposals/ProposalCpeSelector.tsx` | Adicionar `items-end` à grid dos campos de energia |

