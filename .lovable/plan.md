

## Corrigir métricas de energia no ClientDetailsDrawer

O `ClientDetailsDrawer.tsx` tem dois blocos que mostram MWh e kWp (linhas 372-379) e o card CPE/CUI (linha 270-282) condicionados apenas por `isTelecom`, sem verificar `modules.energy`.

### Alterações em `src/components/clients/ClientDetailsDrawer.tsx`

1. Importar `useModules` do hook existente
2. Criar `const showEnergy = isTelecom && modules.energy`
3. **Métricas (linhas 366-386)**: Usar `showEnergy` em vez de `isTelecom` para os blocos MWh e kWp — manter o bloco Comissão visível para telecom
4. **CPE/CUI card (linhas 270-282)**: Condicionar com `showEnergy` em vez de `isTelecom`
5. Ajustar o grid de métricas para usar `showEnergy` no className

