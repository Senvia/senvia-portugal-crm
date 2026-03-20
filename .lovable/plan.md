

## Remover secção "Resumo antes de importar"

### O que fazer

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

Remover a secção "Resumo antes de importar" (linhas 220-232) que mostra linhas lidas, linhas válidas e colunas detectadas. Também remover o import `FileSearch` que deixa de ser usado.

### Alterações
1. **Remover linhas 220-232** — a `<section>` com ícone `FileSearch` e o resumo
2. **Remover `FileSearch`** do import de `lucide-react` (linha 2)

