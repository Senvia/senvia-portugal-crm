

## Plano: Adaptar "Serviços" para telecom sem módulo energy

### Contexto
- **Perfect2Gether** → telecom com `modules.energy = true` → usa kWp nos Serviços ✅ (não mexer)
- **Escolha Inteligente** → telecom com `modules.energy = false` → kWp não faz sentido, deve contar contratos

A condição já existe: `showEnergy = niche === 'telecom' && modules.energy`. Vamos reutilizar esta mesma flag para decidir a unidade e lógica de contagem nos blocos de Serviços.

### Alterações

#### 1. `src/hooks/useActivationObjectives.ts`
- O `sumActivations` recebe um novo parâmetro opcional `countMode: 'value' | 'count'`
- Quando `countMode === 'count'`, retorna `filtered.length` (número de vendas) em vez de somar kWp
- Default: `'value'` (comportamento atual, sem breaking change)

#### 2. `src/components/dashboard/ActivationsPanel.tsx`
- Determinar `servicosUnit`: se `modules.energy` → `"kWp"`, senão → `"contratos"`
- Passar um wrapper de `countActivations` para os blocos de Serviços que usa `countMode = 'count'` quando `!modules.energy`
- Apenas afeta os blocos com `proposalType="servicos"` — os de Energia ficam intactos

### Resultado
| Org | Energy module | Serviços unit | Contagem |
|-----|--------------|---------------|----------|
| Perfect2Gether | ✅ on | kWp | soma kWp |
| Escolha Inteligente | ❌ off | contratos | count vendas delivered |

**Impacto**: 2 ficheiros. Zero alteração para orgs com energy ativo.

