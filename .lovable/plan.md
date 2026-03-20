

## Problema: dados do ficheiro importado aparecem em todos os meses

### Diagnóstico

- A venda **0022** tem `activation_date = 2026-01-14` (janeiro).
- O `useLiveCommissions` filtra vendas do sistema por `activation_date` dentro do mês selecionado — correcto.
- Os `commission_chargeback_items` (dados do ficheiro importado) são carregados **sem qualquer filtro de mês** — aparecem sempre, independentemente do mês selecionado.
- Resultado: ao trocar de mês no filtro, os dados do ficheiro continuam a aparecer porque não estão vinculados ao período.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

1. Na linha 250-263, onde se itera `liveData?.commercials`, o `useLiveCommissions` já filtra por mês. Mas os items do ficheiro (linhas 265-287) e a construção de `userFileData` (linhas 239-248) usam items sem filtro mensal.

2. O ficheiro importado contém a coluna **"Linha de Contrato: Data de inicio"** no `raw_row`. Usar esta data para filtrar os items pelo mês selecionado:
   - No `useMemo`, após obter `itemsFromActiveImport`, filtrar adicionalmente os items cuja data de início (extraída do `raw_row`) caia no mês seleccionado (`selectedMonth`).
   - Se a data de início não existir no `raw_row`, o item **não aparece** (ou opcionalmente aparece sempre — a definir).

3. Passar `selectedMonth` como dependência do `useMemo` (já é indirectamente via `liveCommissions`, mas tornar explícito).

### Alternativa mais simples

Se o ficheiro importado não deve ser filtrado por mês (é um ficheiro global), então a Análise de Comissões deve ignorar o filtro de mês para os dados do ficheiro e apenas mostrar os dados do ficheiro independentemente do mês. Nesse caso, remover a dependência do `useLiveCommissions` (que traz dados do sistema filtrados por mês) e usar apenas os dados do ficheiro.

**Recomendação**: Filtrar os items do ficheiro pela coluna "Data de inicio" para que apenas apareçam no mês correspondente.

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — adicionar filtro mensal aos items do ficheiro baseado na data de início do `raw_row`

