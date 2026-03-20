

## Remover filtro por "Tipo" da importação

### O que fazer

Remover toda a lógica relacionada à coluna "Tipo" e ao filtro `typeFilterValue` do dialog de importação, simplificando o fluxo.

### Alterações em `src/components/finance/ImportChargebacksDialog.tsx`

1. **Remover** a função `detectTypeColumn` (linhas 63-82)
2. **Remover estados**: `selectedTypeColumn`, `typeFilterValue`, `suggestedTypeColumn`
3. **Remover** referências no `useEffect` (linha 122-124) e nos callbacks `onFileLoaded`/`onClearFile`
4. **Simplificar `filteredRows`** — já não é necessário, `preparedRows` usa `rows` directamente
5. **Remover do resumo** a linha "Linhas filtradas" e a menção a "Tipo" no rodapé
6. **Limpar imports** não utilizados (`Filter`)

O `preparedRows` passa a trabalhar directamente com `rows` em vez de `filteredRows`.

