

## Corrigir padding no modal "Adicionar Reclamação" e prevenir recorrência

### Problema
A variante `fullScreen` do `DialogContent` não inclui padding (ao contrário da variante `default` que tem `p-6`). O conteúdo do dialog fica colado às bordas.

### Solução

**1. Corrigir `dialog.tsx`** — Adicionar padding base à variante `fullScreen`
- Adicionar `p-4 md:p-6` à classe da variante `fullScreen` em `dialogContentVariants`, garantindo que **todos os futuros modais fullScreen** já têm padding por defeito.

**2. Sem alteração necessária em `PortalTotalLinkReclamacaoAddDialog.tsx`** — o padding passa a vir do próprio variant.

### Alteração concreta

No ficheiro `src/components/ui/dialog.tsx`, na string `fullScreen` do objeto `dialogContentVariants`, adicionar `p-4 md:p-6` às classes.

