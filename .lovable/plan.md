

## Corrigir modais responsivos em mobile

### Problema identificado

O componente base `DialogContent` (variante `default`) em `src/components/ui/dialog.tsx` não tem restrições de largura/altura para mobile:

```
// Variante default atual — sem limites mobile
"... w-full max-w-lg ... gap-4 border bg-background p-6 ..."
```

Isto causa:
- Modais com `max-w-3xl`, `max-w-2xl`, `max-w-[700px]` ultrapassam a largura do ecrã → scroll lateral
- Modais com `max-h-[90vh]` + `p-6` não respeitam safe areas do iPhone
- Sem `overflow-y-auto` base, conteúdo longo sai do viewport

### Solução

**1 ficheiro principal**: `src/components/ui/dialog.tsx`

Alterar a variante `default` para incluir:
- `max-w-[calc(100vw-2rem)]` — garante que nenhum modal excede a largura do ecrã menos margens
- `max-h-[calc(100dvh-2rem)]` — limita altura ao viewport dinâmico (dvh respeita barra de endereço mobile)
- `overflow-y-auto` — scroll interno quando conteúdo excede
- `safe-top safe-bottom` — respeitar notch/Dynamic Island em iOS

Resultado: qualquer modal que use a variante default (com qualquer `max-w-*` via className) ficará automaticamente limitado ao ecrã, sem necessidade de alterar cada modal individualmente.

**Ficheiros secundários** (2 modais que usam `max-w-3xl` sem ser fullScreen — os mais problemáticos):
- `src/components/marketing/CreateTemplateModal.tsx` — já tem `max-h-[90vh] overflow-y-auto`, a correção no base resolve
- `src/components/marketing/EditTemplateModal.tsx` — idem

A correção no componente base resolve ~56 modais de uma vez.

### Detalhe técnico

```css
/* Variante default corrigida */
"pointer-events-auto fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg 
 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto
 translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 
 shadow-lg duration-200 sm:rounded-lg safe-top safe-bottom ..."
```

O `max-w-[calc(100vw-2rem)]` funciona como tecto — se um modal define `max-w-3xl` via className, o CSS aplica o menor dos dois valores, impedindo overflow.

