

## Alinhar filtros na pagina de Propostas

### Problema
Os filtros (pesquisa, equipa, status, periodo) nao estao alinhados verticalmente porque o contentor flex nao tem `items-center`.

### Solucao
Adicionar `items-center` ao contentor dos filtros na linha 131 de `src/pages/Proposals.tsx`.

### Alteracao

**`src/pages/Proposals.tsx`** (1 linha)

Linha 131: Alterar `flex flex-col sm:flex-row gap-3` para `flex flex-col sm:flex-row sm:items-center gap-3`

### Ficheiro a editar
- `src/pages/Proposals.tsx` (1 linha)

