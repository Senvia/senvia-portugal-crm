

## Diagnóstico de Performance (Lighthouse Mobile: 59)

O problema principal: **todo o JavaScript da aplicação é carregado de uma vez** (zero code splitting). A página de Login carrega Dashboard, Calendar, Ecommerce, Marketing, Finance, Settings, etc. - tudo junto. Isto causa:

- **FCP 6.6s / LCP 8.6s** - JS bundle enorme bloqueia o render
- **863 KiB de JS não utilizado** (Lighthouse confirma)
- **Font blocking** - Google Fonts carregado via `@import` no CSS (render-blocking)

## Plano: Otimização de performance

### 1. Lazy loading de todas as páginas (`src/App.tsx`)
Converter todos os imports de páginas para `React.lazy()` com `Suspense`. A página de Login carrega apenas ~20KB em vez de >1MB.

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
// ... todas as 30+ páginas
```

### 2. Eliminar font blocking (`src/index.css`)
Trocar `@import url(...)` por `<link rel="preload">` no `index.html` com `display=swap`.

### 3. Preload da logo (`index.html`)
Adicionar `<link rel="preload" as="image">` para a logo do Login (é o LCP element).

### 4. Corrigir viewport para acessibilidade (`index.html`)
Remover `user-scalable=no` e `maximum-scale=1.0` (flag do Lighthouse + melhora score).

### Ficheiros afetados
- `src/App.tsx` (lazy imports + Suspense)
- `src/index.css` (remover @import de fonts)
- `index.html` (preload font, preload logo, fix viewport)

### Impacto esperado
- FCP: 6.6s → ~2-3s (JS bundle da Login page reduzido em ~80%)
- LCP: 8.6s → ~3-4s (logo preloaded + font não bloqueia render)
- Score: 59 → 75-85+

