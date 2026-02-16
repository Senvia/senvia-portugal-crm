
# Aumentar Tamanho do Modal "Adicionar Receita"

## Problema
O modal em desktop esta demasiado pequeno e apertado com `md:max-w-md` (448px).

## Solucao
Aumentar a largura maxima para `md:max-w-lg` (512px) e adicionar padding interno adequado.

## Alteracao

### Ficheiro: `src/components/finance/AddRevenueModal.tsx`

Linha 59 — alterar `md:max-w-md` para `md:max-w-lg` e garantir padding com `md:p-6`:

```tsx
<DialogContent variant="fullScreen" className="md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-lg md:h-auto md:max-h-[90vh] md:rounded-lg md:border md:p-6">
```

Isto aumenta a largura do modal e adiciona espaçamento interno consistente em desktop.
