

## Correção: Otto Chat e Auditoria de Safe Areas no iPhone

### Problema Principal
O OttoChatWindow em mobile usa `fixed inset-0` (ecrã inteiro) e aplica `pt-safe` no header interno. Mas pela screenshot, o conteúdo do header (avatar + texto) está por trás da barra de estado/Dynamic Island do iPhone.

### Causa
A classe `pt-safe` depende de `env(safe-area-inset-top)` que pode não ser aplicada corretamente quando o container pai não tem background que cubra a safe area. Além disso, o input na parte inferior pode ter o mesmo problema com a safe area bottom.

### Correções

**1. `src/components/otto/OttoChatWindow.tsx`** — Container mobile com safe area nativa:
- Mudar o container mobile de `fixed inset-0` para incluir padding safe-area diretamente no container principal (não apenas no header)
- Usar `pt-[env(safe-area-inset-top)]` no container ou manter o background a cobrir toda a área mas garantir que o header respeita o safe area

```tsx
// Container mobile: adicionar safe area ao próprio container
isMobile
  ? "fixed inset-0 z-[9999] bg-background flex flex-col"
  // O header já tem pt-safe, mas vamos reforçar no container
```

A abordagem correta: manter `inset-0` para o background cobrir tudo, mas garantir que o header usa padding suficiente. O problema real pode estar na classe `pt-safe` que usa `clamp(20px, ...)` — vamos simplificar para usar `env()` diretamente no header do Otto:

```tsx
// Header: usar env() diretamente em vez da classe pt-safe
<div className={`flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30`}
     style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' } : undefined}>
```

E no input area inferior:
```tsx
// Input: usar env() diretamente para bottom safe area
<div className={`p-3 border-t border-border bg-muted/20`}
     style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' } : undefined}>
```

**2. Auditoria de outros componentes mobile** — Verificar e corrigir se necessário:
- `MobileHeader.tsx` — usa `safe-top` ✅ (funciona porque é `padding-top`)
- `MobileBottomNav.tsx` — usa `safe-bottom` ✅
- `MobileMenu.tsx` — verificar se respeita safe areas
- Modais fullscreen (`DialogContent variant="fullScreen"`) — verificar `pt-safe`
- `sheet.tsx` — já usa `pt-safe` ✅

**3. Verificar `MobileMenu.tsx`** para garantir safe areas

São correções cirúrgicas — apenas no OttoChatWindow e em qualquer outro componente mobile fullscreen que não esteja a respeitar safe areas.

