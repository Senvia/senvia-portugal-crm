

## Adicionar metricas telecom aos cards de Vendas (como nas Propostas)

### Objetivo
Para organizacoes telecom, mostrar consumo total (MWh) e kWp nos cards de resumo da pagina de Vendas, tal como ja existe na pagina de Propostas.

### Alteracoes

**1. Criar `src/hooks/useTelecomSaleMetrics.ts`**
- Hook semelhante ao `useTelecomProposalMetrics`
- Calcula a partir da tabela `sales`:
  - `totalMWh`: soma de `consumo_anual` de todas as vendas / 1000
  - `totalKWp`: soma de `kwp` das vendas com `proposal_type = 'servicos'`
  - `deliveredMWh` / `deliveredKWp`: filtrado por `status = 'delivered'`
- Apenas ativo quando `organization.niche === 'telecom'`

**2. Editar `src/pages/Sales.tsx`**
- Importar e usar o novo hook `useTelecomSaleMetrics`
- Verificar `isTelecom = organization?.niche === 'telecom'`
- No card "Total Vendas" -- adicionar linha secundaria com MWh e kWp totais
- No card "Entregues" -- adicionar linha secundaria com MWh e kWp entregues
- Renderizacao condicional: so aparece se `isTelecom`

### Resultado visual (cards)

```text
+-------------------+-------------------+
| Total Vendas      | Entregues         |
| 12                | 8                 |
| 45.000,00 EUR     | 32.000,00 EUR     |
| 125.3 MWh . 45 kWp| 98.1 MWh . 30 kWp| <-- apenas telecom
+-------------------+-------------------+
```

### Secao Tecnica

**useTelecomSaleMetrics.ts:**
```ts
// Query sales com consumo_anual e kwp
// totalMWh = sum(consumo_anual) / 1000
// totalKWp = sum(kwp) where proposal_type = 'servicos'
// deliveredMWh/deliveredKWp = mesmo filtrado por status='delivered'
```

**Sales.tsx -- cards com metricas telecom:**
```tsx
{isTelecom && telecomMetrics && (
  <p className="text-xs text-muted-foreground mt-1">
    {telecomMetrics.totalMWh.toFixed(1)} MWh · {telecomMetrics.totalKWp.toFixed(1)} kWp
  </p>
)}
```

### Ficheiros
- **Criar**: `src/hooks/useTelecomSaleMetrics.ts`
- **Editar**: `src/pages/Sales.tsx`
