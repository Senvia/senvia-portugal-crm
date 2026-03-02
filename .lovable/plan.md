

## Diagnóstico detalhado

Com base no profiling e análise do código, o lazy loading já está implementado. Os problemas restantes são:

1. **Meta Pixel bloqueia o render** — script síncrono no `<head>` executa antes de qualquer conteúdo
2. **Logo preload errado** — preloada `/senvia-logo-white.png` mas a Login page usa `@/assets/senvia-logo.png` (ficheiro diferente, bundled pelo Vite)
3. **Font com 6 pesos desnecessários** — carrega 300-800 mas só precisa de 400, 500, 600, 700
4. **HelmetProvider carrega react-helmet-async** no bundle inicial, mas o SEO já está hardcoded no `index.html`
5. **PWAInstallButton carregado eager** no App.tsx — deveria ser lazy

## Plano de otimização

### 1. Defer Meta Pixel (`index.html`)
- Mover o script do Facebook Pixel para o final do `<body>`, depois do `<div id="root">`
- Isto desbloqueia o parser e permite que o HTML renderize primeiro

### 2. Corrigir preload da logo (`index.html`)
- Remover preload de `/senvia-logo-white.png` (não é usado na Login)
- A logo real é bundled pelo Vite (`@/assets/senvia-logo.png`), não pode ser preloaded via HTML
- Adicionar `fetchpriority="high"` à tag `<img>` no `Login.tsx` para priorizar o LCP element

### 3. Reduzir font weights (`index.html`)
- Mudar de `wght@300;400;500;600;700;800` para `wght@400;500;600;700`
- Reduz o tamanho do download de fontes

### 4. Lazy load HelmetProvider (`src/main.tsx`)
- Remover `react-helmet-async` do bundle crítico
- Lazy load o SEO component em vez de wrapping toda a app

### 5. Lazy load PWAInstallButton (`src/App.tsx`)
- Converter `PWAInstallButton` para `lazy()` — não é necessário no render inicial

### 6. Login.tsx — otimizar LCP (`src/pages/Login.tsx`)
- Adicionar `fetchpriority="high"` e `loading="eager"` na `<img>` do logo
- Adicionar `width` e `height` para evitar layout shift (CLS)

### Ficheiros afetados
- `index.html` (defer pixel, fix preload, reduce fonts)
- `src/main.tsx` (remover HelmetProvider wrapper)
- `src/App.tsx` (lazy PWAInstallButton)
- `src/pages/Login.tsx` (fetchpriority no logo)

### Impacto esperado
- FCP: redução de ~1-2s (desbloqueio do Meta Pixel + font otimizado)
- LCP: redução de ~0.5-1s (fetchpriority no logo)
- Best Practices: +5-10 pontos (defer third-party scripts)

