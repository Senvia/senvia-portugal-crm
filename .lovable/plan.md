

## Corrigir métricas de energia nos cards de Clientes e Vendas

Dois locais ainda mostram MWh/kWp mesmo com `energy` desativado:

### 1. `src/pages/Clients.tsx` (linhas 240-242)
O card "Comissão Total" mostra `MWh · kWp` como subtexto. Precisa condicionar com `showEnergy`:
- Linha 240-242: envolver `{showEnergy && <p>...MWh · kWp</p>}` (a variável `showEnergy` já existe neste ficheiro)

### 2. `src/pages/Sales.tsx` (linhas 146-150 e 183-187)
Dois cards mostram `MWh · kWp`:
- Card "Total Vendas" (linha 146-150): `isTelecom && telecomMetrics` → adicionar `&& modules.energy`
- Card "Concluídas" (linha 183-187): mesmo tratamento
- Filtro de tipo energia/serviços (linhas 218-230): condicionar com `modules.energy` em vez de só `isTelecom`
- Importar `useModules` no ficheiro

Alterações simples: 2 ficheiros, ~6 linhas modificadas cada.

