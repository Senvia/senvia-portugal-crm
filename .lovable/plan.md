
# Adicionar Filtro de Periodo na Pagina de Vendas

## Objetivo
Adicionar um `DateRangePicker` na pagina de Vendas para filtrar vendas por periodo (usando `sale_date`). Os summary cards tambem devem refletir apenas as vendas do periodo selecionado.

## Alteracoes

### Ficheiro: `src/pages/Sales.tsx`

1. **Importar** o `DateRangePicker` e o tipo `DateRange`:
   - `import { DateRangePicker } from "@/components/ui/date-range-picker"`
   - `import { DateRange } from "react-day-picker"`
   - `import { parseISO, startOfDay, endOfDay } from "date-fns"`

2. **Novo estado persistido** para o periodo:
   - `const [dateRange, setDateRange] = usePersistedState<DateRange | undefined>("sales-date-range-v1", undefined)`

3. **Adicionar o DateRangePicker** na barra de filtros (linha 168), ao lado do filtro de status:
   - Renderizar `<DateRangePicker value={dateRange} onChange={setDateRange} />` dentro da row de filtros

4. **Filtrar vendas por periodo** no `filteredSales` (useMemo):
   - Adicionar verificacao: se `dateRange.from` existe, filtrar vendas cujo `sale_date` esta dentro do intervalo
   - Usar `parseISO(sale.sale_date)` para comparar com `startOfDay(dateRange.from)` e `endOfDay(dateRange.to)`

5. **Recalcular stats** — ja usa `filteredSales` como base? Nao, usa `sales` (todas). Alterar o `stats` useMemo para usar `filteredSales` em vez de `sales`, para que os cards reflitam o periodo selecionado.

### Detalhe tecnico do filtro

```typescript
// No filteredSales useMemo, adicionar antes dos outros filtros:
const matchesDate = (() => {
  if (!dateRange?.from) return true;
  const saleDate = parseISO(sale.sale_date);
  if (saleDate < startOfDay(dateRange.from)) return false;
  if (dateRange.to && saleDate > endOfDay(dateRange.to)) return false;
  return true;
})();

return matchesSearch && matchesStatus && matchesDate;
```

### Layout dos filtros (mobile-first)

O `DateRangePicker` sera adicionado como ultimo elemento na row de filtros, com `w-full sm:w-auto` para ocupar a largura toda em mobile e adaptar-se em desktop.

### Resumo

- **1 ficheiro alterado**: `src/pages/Sales.tsx`
- **0 alteracoes de base de dados**
- Os summary cards passam a refletir o periodo selecionado
- Estado do filtro persiste entre navegacoes via `usePersistedState`
