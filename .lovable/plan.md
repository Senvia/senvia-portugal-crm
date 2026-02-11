

## Corrigir borda azul (focus ring) cortada no Editar Proposta

### Problema
O `ScrollArea` aplica `overflow: hidden` internamente, o que corta o `ring` (borda azul de foco) dos inputs que ficam junto aos limites do container. Isto acontece porque o padding esta aplicado diretamente no `ScrollArea` (`px-6`), nao deixando espaco para o ring que se estende 2px para fora do input.

### Solucao
Mover o padding do `ScrollArea` para o conteudo interno (`form`), e adicionar um pequeno padding extra no ScrollArea para acomodar os focus rings.

### Alteracao

**`src/components/proposals/EditProposalModal.tsx`** (linhas 326-327)

```tsx
// Antes:
<ScrollArea className="flex-1 px-6">
  <form onSubmit={handleSubmit} className="py-4 space-y-4">

// Depois:
<ScrollArea className="flex-1">
  <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
```

Isto garante que o `overflow-hidden` do ScrollArea nao corta os focus rings, porque o padding interno do form cria espaco suficiente.

### Ficheiro a editar
- `src/components/proposals/EditProposalModal.tsx` (1 linha)

