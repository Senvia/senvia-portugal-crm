

## Modais abaixo do header no mobile (PWA)

### Problema
No mobile, os modais (tanto `default` como `fullScreen`) ocupam toda a viewport, cobrindo o header com o logo e o menu. O utilizador perde a referência visual da app.

### Solução — `src/components/ui/dialog.tsx`

Ajustar ambas as variantes para que, no mobile (`< md`), o modal comece abaixo do header. O header mobile tem `h-14` (3.5rem) + safe-area-inset-top.

**1. Variante `fullScreen`:**
- Trocar `inset-0` por `inset-x-0 bottom-0` + `top-[calc(3.5rem+env(safe-area-inset-top,0px))]` no mobile
- No desktop (`md:`), manter o comportamento atual com `md:inset-0`
- Remover `pt-safe` no mobile (já não precisa, o header cobre a safe area)

**2. Variante `default`:**
- No mobile, posicionar com `top-[calc(3.5rem+env(safe-area-inset-top,0px)+1rem)]` em vez de `top-[50%] -translate-y-[50%]`
- Manter centragem vertical no desktop via `sm:top-[50%] sm:-translate-y-[50%]`

**3. Overlay:**
- O overlay mantém `inset-0` (escurece tudo incluindo o header), mas o z-index do header (`z-50`) já o mantém por cima se necessário
- Alternativa: subir o header para `z-[60]` para ficar sempre visível por cima do overlay

**4. Header z-index:**
- Alterar o `MobileHeader` de `z-50` para `z-[60]` para garantir que fica acima do overlay dos modais (`z-50`)

### Ficheiros alterados
1. `src/components/ui/dialog.tsx` — variantes responsive
2. `src/components/layout/MobileHeader.tsx` — z-index para `z-[60]`

### Resultado
- No mobile: header sempre visível, modais aparecem abaixo do logo/menu
- No desktop: comportamento inalterado (sidebar + modal fullscreen ou centrado)

