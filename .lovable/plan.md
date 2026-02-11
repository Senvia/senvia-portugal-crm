

## Corrigir scroll no Editar Proposta

### Problema
Apos mover o `px-6` do `ScrollArea` para o `form`, o scroll deixou de funcionar. O `ScrollArea` com `flex-1` precisa de `min-h-0` para funcionar correctamente dentro de um flex container -- sem isso, o conteudo expande o container em vez de activar o scroll.

### Solucao
Adicionar `min-h-0` ao `ScrollArea` para que o flexbox permita o encolhimento e o scroll funcione.

### Alteracao

**`src/components/proposals/EditProposalModal.tsx`** (linha 326)

```tsx
// Antes:
<ScrollArea className="flex-1">

// Depois:
<ScrollArea className="flex-1 min-h-0">
```

### Ficheiro a editar
- `src/components/proposals/EditProposalModal.tsx` (1 linha)

