

## Corrigir scroll no modal Nova Proposta

### Problema
O mesmo problema que existia no Editar Proposta: o `ScrollArea` do Radix nao resolve alturas correctamente dentro de flex containers (`flex-1 min-h-0`), impedindo o scroll.

### Solucao
Substituir `ScrollArea` por `div` com `overflow-y-auto` (mesma correcao aplicada ao EditProposalModal).

### Alteracoes em `src/components/proposals/CreateProposalModal.tsx`

1. **Linha 263**: Substituir `<ScrollArea className="flex-1 min-h-0">` por `<div className="flex-1 min-h-0 overflow-y-auto">`
2. **Fecho correspondente**: Substituir `</ScrollArea>` por `</div>`
3. **Remover import** do `ScrollArea` se nao for usado noutro local do ficheiro

### Ficheiro a editar
- `src/components/proposals/CreateProposalModal.tsx` (3 linhas)

