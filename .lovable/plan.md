

## Corrigir: linhas CB do ficheiro não aparecem porque o filtro de mês exclui-as

### Problema
Linha 284-290 do `useCommissionAnalysis.ts`:
```ts
const itemsFromActiveImport = itemsFromActiveImportRaw.filter((item) => {
  const parsed = parseRawRow(item.raw_row);
  if (!parsed || !parsed.dataInicio) return false;  // ← CB lines sem data são excluídas
  ...
});
```
Linhas CB no ficheiro provavelmente não têm "Data de inicio" preenchida → `parsed.dataInicio` é vazio → `return false` → são descartadas antes de chegar à tabela e aos cards.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`** (linhas 284-290)

Alterar o filtro para **incluir linhas sem data de início** (em vez de excluí-las). Lógica:
- Se a linha tem `dataInicio` válida → filtrar pelo mês selecionado (comportamento atual)
- Se a linha **não tem** `dataInicio` → incluir sempre (não descartar)

```ts
const itemsFromActiveImport = itemsFromActiveImportRaw.filter((item) => {
  const parsed = parseRawRow(item.raw_row);
  if (!parsed) return false;
  if (!parsed.dataInicio) return true; // ← incluir linhas sem data (ex: CB)
  const d = parseDateValue(parsed.dataInicio);
  if (!d || isNaN(d.getTime())) return true; // data inválida → incluir também
  return d.getFullYear() === selectedYear && d.getMonth() === selectedMonthNum;
});
```

Isto garante que as linhas CB aparecem na tabela e são contabilizadas nos cards de resumo.

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — 2 linhas no filtro (284-290)

