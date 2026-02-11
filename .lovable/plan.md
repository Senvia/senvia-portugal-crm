

## Corrigir scroll no Editar Proposta (solucao definitiva)

### Problema
O `ScrollArea` do Radix UI nao funciona correctamente dentro de flex containers porque o `Viewport` interno usa `h-full` que depende de uma cadeia de alturas explicitas. Dentro de um flex com `flex-1 min-h-0`, essa cadeia quebra e o scroll nao activa.

### Solucao
Substituir o `ScrollArea` por um simples `div` com `overflow-y-auto`, que funciona nativamente em flex layouts sem depender de alturas resolvidas.

### Alteracao

**`src/components/proposals/EditProposalModal.tsx`**

Linha 326: Substituir `<ScrollArea className="flex-1 min-h-0">` por `<div className="flex-1 min-h-0 overflow-y-auto">`

Linha 714: Substituir `</ScrollArea>` por `</div>`

Remover o import do `ScrollArea` (linha 12) se nao for usado noutro local do ficheiro.

### Resultado
O scroll funciona de forma nativa e fiavel, sem dependencia do componente Radix ScrollArea. Os focus rings dos inputs continuam vissiveis porque o padding esta no `form` interno.

### Ficheiro a editar
- `src/components/proposals/EditProposalModal.tsx` (3 linhas)
