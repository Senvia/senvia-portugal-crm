

## Filtrar cards CB pelo mês selecionado

### Problema
Na correção anterior, mudámos o cálculo dos cards para usar `itemsFromActiveImportRaw` (sem filtro de mês) para resolver o problema do zero. Mas agora **todos os meses mostram os mesmos valores**, porque estamos a somar o ficheiro inteiro.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`** — Linha 448

Trocar `itemsFromActiveImportRaw` por `itemsFromActiveImport` (que já está filtrado pelo mês selecionado). As linhas CB sem data já passam no filtro (linha 297: `if (!parsed.dataInicio) return true`), portanto continuam a ser incluídas.

```ts
// Antes:
for (const item of itemsFromActiveImportRaw) {

// Depois:
for (const item of itemsFromActiveImport) {
```

Uma única linha a alterar.

