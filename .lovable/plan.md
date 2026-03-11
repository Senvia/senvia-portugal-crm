## Adaptar "Serviços" para telecom sem módulo energy

### Estado: ✅ Implementado

### Alterações Realizadas

**1. `src/hooks/useActivationObjectives.ts`**
- `sumActivations` agora aceita parâmetro opcional `countMode: 'value' | 'count'`
- Quando `countMode === 'count'`, retorna `filtered.length` (número de vendas delivered)
- Default: `'value'` (comportamento atual preservado)

**2. `src/components/dashboard/ActivationsPanel.tsx`**
- Blocos de Serviços usam `countMode = 'count'` quando `modules.energy = false`
- Unidade exibida: `"kWp"` → `"contratos"` quando energy desativado
- Blocos de Energia não afetados

### Resultado
| Org | Energy module | Serviços unit | Contagem |
|-----|--------------|---------------|----------|
| Perfect2Gether | ✅ on | kWp | soma kWp |
| Escolha Inteligente | ❌ off | contratos | count vendas delivered |

**Impacto**: Zero alteração para orgs com energy ativo.
