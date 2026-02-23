

# Fix: Otto Clicavel por Cima de Modais (Fix Definitivo)

## Problema
O `DialogOverlay` tem `fixed inset-0` e captura **todos** os eventos de pointer na tela inteira. O `onPointerDownOutside` no `DialogContent` nao resolve porque o overlay bloqueia o clique antes de chegar ao Otto.

## Solucao
Tornar o overlay transparente a eventos de pointer (`pointer-events-none`) e adicionar `pointer-events-auto` ao conteudo do dialog.

## Alteracoes

### Ficheiro: `src/components/ui/dialog.tsx`

1. **DialogOverlay** - Adicionar `pointer-events-none` para que o overlay nao bloqueie cliques em elementos acima dele (como o Otto)

2. **DialogContent (ambas variantes)** - Adicionar `pointer-events-auto` para que o conteudo do modal continue a receber cliques normalmente

### Detalhe Tecnico

```text
DialogOverlay:  "fixed inset-0 z-50 bg-black/80 pointer-events-none ..."
DialogContent:  "... z-50 pointer-events-auto ..."
```

O overlay continua visualmente presente (fundo escuro), mas nao intercepta cliques. O conteudo do dialog mantem a interactividade normal. O Otto, com `z-[9999]`, fica totalmente acessivel.

### Efeito colateral a mitigar
Sem pointer-events no overlay, clicar fora do dialog (no fundo escuro) ja nao fecha o modal automaticamente. Para manter esse comportamento, vamos usar o `onInteractOutside` do Radix que ja esta configurado no `DialogContent`.

