

## Fix: Modais a sobrepor safe area do iPhone (PWA)

### Causa raiz
O problema esta nas classes CSS usadas nos modais:
- `safe-top` = `padding-top: var(--safe-area-top)` → pode ser **0px** em certos contextos PWA
- `pt-safe` = `padding-top: calc(clamp(20px, var(--safe-area-top), 50px) + 0.75rem)` → garante **minimo 20px**

A variante `fullScreen` do Dialog usa `safe-top` e `safe-bottom` (sem minimo), resultando em 0px de padding no iPhone.

### Alteracoes

**1. `src/components/ui/dialog.tsx`**
- **fullScreen variant**: Substituir `safe-top safe-bottom` por `pt-safe pb-safe` para garantir padding minimo
- **default variant**: Atualizar o inline style `top` para usar `clamp()` com minimo de 20px, igual ao padrao `pt-safe`

**2. `src/components/ui/sheet.tsx`**
- Verificar e garantir que `pt-safe` (com clamp) esta a ser usado em vez de `safe-top`
- O Sheet ja usa `pt-safe` — OK, sem alteracao necessaria

**3. `src/components/ui/alert-dialog.tsx`**
- Atualizar o inline style `top` para usar `clamp()` com minimo, igual ao Dialog default

**4. `src/components/ui/drawer.tsx`**
- Drawer e bottom-only com `pb-safe` — OK, sem alteracao

### Resumo das mudancas
| Componente | Antes | Depois |
|---|---|---|
| Dialog fullScreen | `safe-top safe-bottom` | `pt-safe pb-safe` |
| Dialog default (top) | `var(--safe-area-top) + 1rem` | `clamp(20px, var(--safe-area-top), 50px) + 1rem` |
| AlertDialog (top) | `var(--safe-area-top) + 1rem` | `clamp(20px, var(--safe-area-top), 50px) + 1rem` |

3 ficheiros alterados, correcao puramente CSS/classes.

