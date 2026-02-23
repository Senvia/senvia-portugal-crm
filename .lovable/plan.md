
# Tornar o Otto Sempre Visivel (Fix Definitivo)

## Problema
O Otto FAB esta dentro do `AppLayout`, que e renderizado na arvore normal do DOM. Os modais (Dialog) usam portais do Radix que injetam elementos no final do `<body>`. Mesmo com `z-[60]`, o overlay do modal cobre o Otto porque o portal do modal aparece **depois** no DOM.

## Solucao
Renderizar o Otto FAB via `createPortal` do React para o `document.body`. Isto garante que o Otto e sempre o ultimo elemento no DOM, ficando visualmente por cima de qualquer modal ou overlay.

## Alteracoes

### Ficheiro: `src/components/otto/OttoFAB.tsx`
- Importar `createPortal` de `react-dom`
- Envolver todo o return do componente num `createPortal(content, document.body)`
- Manter o `z-[60]` como esta

Codigo conceptual:
```text
import { createPortal } from "react-dom";

export function OttoFAB() {
  // ... logica existente ...

  return createPortal(
    <>
      <AnimatePresence>...</AnimatePresence>
      {!isOpen && <motion.div>...</motion.div>}
    </>,
    document.body
  );
}
```

Isto resolve o problema de forma definitiva, sem precisar de alterar z-index de nenhum outro componente.
