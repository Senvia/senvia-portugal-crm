

## Auditoria: Safe area em todos os componentes fullscreen do PWA

### Resultado da analise

Todos os componentes `fixed inset-0` (fullscreen) foram verificados. O estado atual:

| Componente | Safe area | Estado |
|---|---|---|
| Dialog (default) | `clamp(20px, ...)` inline style | OK |
| Dialog (fullScreen) | `pt-safe pb-safe` | OK |
| AlertDialog | `clamp(20px, ...)` inline style | OK |
| Sheet | `pt-safe` | OK |
| Drawer | `pb-safe` (bottom-only) | OK |
| TrialExpiredBlocker | `pt-safe pb-safe` | OK |
| PaymentOverdueBlocker | `pt-safe pb-safe` | OK |
| MobileHeader | `safe-top` | OK (layout — exato) |
| MobileBottomNav | `safe-bottom` | OK (layout — exato) |
| **OttoChatWindow** | `env(safe-area-inset-top, 0px)` inline | **PROBLEMA** — sem minimo, pode ser 0px |
| **OnboardingWizard** | `env(safe-area-inset-top, 0px)` inline | **PROBLEMA** — sem minimo, pode ser 0px |
| **MobileMenu** | `env(safe-area-inset-top, 0px)` inline | **PROBLEMA** — sem minimo, pode ser 0px |

### Problema

3 componentes usam `env(safe-area-inset-top, 0px)` diretamente em inline styles, sem o `clamp()` de minimo 20px. No iPhone PWA, isto pode resultar em conteudo a ficar por tras da barra de estado.

### Correcoes (3 ficheiros)

**1. `src/components/otto/OttoChatWindow.tsx` (linha 110)**
- Substituir `calc(env(safe-area-inset-top, 0px) + 0.75rem)` por `calc(clamp(20px, env(safe-area-inset-top, 0px), 50px) + 0.75rem)`

**2. `src/components/onboarding/OnboardingWizard.tsx` (linha 82)**
- Substituir `calc(env(safe-area-inset-top, 0px) + 1rem)` por `calc(clamp(20px, env(safe-area-inset-top, 0px), 50px) + 1rem)`

**3. `src/components/layout/MobileMenu.tsx` (linha 55)**
- Substituir `calc(env(safe-area-inset-top, 0px) + 0.5rem)` por `calc(clamp(20px, env(safe-area-inset-top, 0px), 50px) + 0.5rem)`

### Resumo
3 ficheiros com alteracao minima (inline style update). Todos os restantes componentes ja estao corretos.

