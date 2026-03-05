

## Corrigir modais na safe area do iPhone (PWA)

### Problema

O modal usa `inset-0 m-auto` que divide o espaço restante **igualmente** entre top e bottom. Além disso, as classes `safe-top safe-bottom` adicionam **padding interno** ao modal scrollável — quando o utilizador faz scroll, esse padding acompanha o conteúdo e o conteúdo vai parar atrás do notch.

No PWA standalone do iPhone, `m-auto` não garante que o top margin seja suficiente para cobrir a safe area assimétrica.

### Solução

Substituir `inset-0 m-auto` + `safe-top safe-bottom` por posicionamento explícito via inline `style`:

**`src/components/ui/dialog.tsx`** (variante `default`):
- Remover `inset-0`, `m-auto`, `max-h-[...]`, `safe-top`, `safe-bottom` das classes
- Usar classes `fixed left-1/2 -translate-x-1/2` para centrar horizontalmente
- Adicionar `style` inline no componente: `top: calc(var(--safe-area-top) + 1rem)`, `bottom: calc(var(--safe-area-bottom) + 1rem)`, `maxHeight: none`
- Manter `overflow-y-auto` para scroll interno
- O modal fica **contido** entre as safe areas sem depender de `m-auto`

**`src/components/ui/alert-dialog.tsx`**:
- Mesma correção: remover `inset-0 m-auto max-h-[...]` e usar posicionamento explícito via `style`

### Ficheiros
1. `src/components/ui/dialog.tsx`
2. `src/components/ui/alert-dialog.tsx`

