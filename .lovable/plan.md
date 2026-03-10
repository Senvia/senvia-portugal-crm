

## Ocultar colunas de Energia no Dashboard quando `modules.energy` está desativado

O toggle de Energias já funciona em Leads, Propostas, Vendas e Clientes, mas os painéis do Dashboard não verificam `modules.energy`. Há 4 componentes no dashboard que mostram dados de energia (Energia MWh, Solar kWp, OP Energia, OP Solar) que precisam ser condicionados.

### Componentes a alterar

| Ficheiro | O que ocultar quando `energy=off` |
|---|---|
| **ActivationsPanel.tsx** | Blocos "Energia — Mensal" e "Energia — Anual" (manter apenas os de Serviços) |
| **CommitmentPanel.tsx** | Colunas "Energia (MWh)" e "Solar (kWp)" nas tabelas |
| **SalesPerformancePanel.tsx** | Colunas "Energia" e "Solar" nas 3 tabelas (Objetivo, Vendas, Concretização) |
| **MetricsPanel.tsx** | Colunas "OP Energia", "Energia", "OP Solar", "Solar" nas 3 tabelas (Métricas, Ritmo, Concretização) |
| **EditObjectiveModal.tsx** | Campos "Total Energia (MWh)" e "Total Solar (kWp)" |
| **EditMetricsModal.tsx** | Campos "OP Energia", "Energia (MWh)", "OP Solar", "Solar (kWp)" |
| **EditCommitmentModal.tsx** | Campos "Energia (MWh)" e "Solar (kWp)" |

### Abordagem

Em cada componente:
1. Importar `useModules` e `useAuth`
2. Calcular `const showEnergy = organization?.niche === 'telecom' && modules.energy` (ou simplesmente `modules.energy` já que estes painéis só aparecem para telecom)
3. Esconder condicionalmente as colunas/campos de energia com `{showEnergy && ...}`
4. Nos `ActivationsPanel`, filtrar os blocos de `proposalType="energia"` quando `energy` está off

