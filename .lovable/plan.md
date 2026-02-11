
## Adicionar Filtro por Data nas Propostas

### Resumo

Adicionar um `DateRangePicker` na barra de filtros da pagina de Propostas, permitindo filtrar propostas por periodo (data da proposta). O componente `DateRangePicker` ja existe no projeto (`src/components/ui/date-range-picker.tsx`).

### O que muda

Na barra de filtros, apos o filtro de status, aparece um seletor de periodo. Ao selecionar um intervalo de datas, apenas as propostas com `proposal_date` dentro desse intervalo sao mostradas. Os cards de resumo tambem refletem os dados filtrados.

### Alteracoes

**Ficheiro:** `src/pages/Proposals.tsx`

1. Importar `DateRangePicker` de `@/components/ui/date-range-picker` e o tipo `DateRange` de `react-day-picker`
2. Adicionar estado `dateRange` (com `usePersistedState`) para guardar o periodo selecionado
3. Adicionar o componente `DateRangePicker` na barra de filtros (apos o select de status)
4. Atualizar a logica de `filteredProposals` para tambem filtrar por `proposal_date` dentro do intervalo selecionado
5. Mover o calculo dos cards de resumo (totalValue, pendingValue, proposalsByStatus) para usar `filteredProposals` em vez de `proposals`, de modo que os totais reflitam os filtros aplicados

### Secao Tecnica

**Filtro de data:**
```
const matchesDate =
  !dateRange?.from ||
  (new Date(proposal.proposal_date) >= dateRange.from &&
   (!dateRange.to || new Date(proposal.proposal_date) <= dateRange.to));
```

**Estado persistido:**
```
const [dateRange, setDateRange] = usePersistedState<DateRange | undefined>('proposals-date-range-v1', undefined);
```
