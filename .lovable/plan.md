

## Filtro de Período + Impressão no Dashboard

### Problema
Todos os hooks e painéis usam `new Date()` hardcoded — não há como ver dados de meses anteriores. Também falta funcionalidade de impressão.

### Solução

#### 1. Estado global de período — `useDashboardPeriod.ts` (novo)
Zustand store com:
- `selectedMonth: Date` (default: mês atual)
- `setSelectedMonth(date: Date)`
- Presets: "Este mês", "Mês anterior", "Há 2 meses" + seletor de mês/ano livre

#### 2. Filtro de período no Dashboard header (novo componente `DashboardPeriodFilter.tsx`)
- Select/Popover com presets de meses rápidos + calendário para escolher qualquer mês
- Fica ao lado do `TeamMemberFilter` na barra de filtros
- Botão de impressora global (🖨️) ao lado dos filtros → `window.print()` com CSS `@media print`

#### 3. Botão de impressora em cada Card
- Adicionar um ícone `Printer` no header de cada painel (CommitmentPanel, SalesPerformancePanel, MetricsPanel, ActivationsPanel)
- Ao clicar, isola esse card e chama `window.print()` (via classe CSS `print-target`)

#### 4. Adaptar hooks para receber `month` como parâmetro
Todos estes hooks passam a aceitar um `Date` em vez de usar `new Date()`:
- **`useCommitments`** — `currentMonth` parametrizado
- **`useMonthlyObjectives`** — `currentMonth` parametrizado
- **`useMonthlyMetrics`** — `currentMonth` parametrizado
- **`useMonthSalesMetrics`** — `monthStart/monthEnd` parametrizado
- **`useActivationObjectives`** — `currentMonthStart/currentYearStart` parametrizado
- **`MetricsPanel`** — query interna de sales usa `monthStart` parametrizado

#### 5. Painéis lêem o período do store
Cada painel importa `useDashboardPeriod()` para obter `selectedMonth` e passa-o ao hook respetivo. O label "março 2026" também reflete o mês selecionado.

#### 6. CSS de impressão (`index.css`)
```css
@media print {
  /* Esconde sidebar, header, filtros */
  .sidebar, .mobile-header, .mobile-bottom-nav, .no-print { display: none !important; }
  /* Quando imprimir card individual */
  .print-single-active .print-target { display: block !important; }
  .print-single-active *:not(.print-target):not(.print-target *) { display: none !important; }
}
```

### Ficheiros a criar/editar
- **Criar**: `src/stores/useDashboardPeriod.ts`
- **Criar**: `src/components/dashboard/DashboardPeriodFilter.tsx`
- **Criar**: `src/components/dashboard/PrintCardButton.tsx`
- **Editar**: `src/pages/Dashboard.tsx` — adicionar filtros + botão print global
- **Editar**: `src/hooks/useCommitments.ts` — aceitar `referenceDate`
- **Editar**: `src/hooks/useMonthlyObjectives.ts` — aceitar `referenceDate`
- **Editar**: `src/hooks/useMonthlyMetrics.ts` — aceitar `referenceDate`
- **Editar**: `src/hooks/useMonthSalesMetrics.ts` — aceitar `referenceDate`
- **Editar**: `src/hooks/useActivationObjectives.ts` — aceitar `referenceDate`
- **Editar**: `src/components/dashboard/CommitmentPanel.tsx` — usar store + print
- **Editar**: `src/components/dashboard/SalesPerformancePanel.tsx` — usar store + print
- **Editar**: `src/components/dashboard/MetricsPanel.tsx` — usar store + print
- **Editar**: `src/components/dashboard/ActivationsPanel.tsx` — usar store + print
- **Editar**: `src/index.css` — regras `@media print`

