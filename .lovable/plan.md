

## Corrigir Safe Area do Otto no iPhone

### Problema

No iPhone, quando o Otto abre em tela cheia no mobile (`fixed inset-0`), o header fica por baixo do notch/Dynamic Island porque nao tem padding para a safe area superior. O mesmo acontece no input inferior que fica por baixo do indicador home do iPhone.

### Solucao

Alterar o `OttoChatWindow.tsx` para aplicar safe area padding no mobile:

**1. Header** - Adicionar `safe-top` (classe ja existente no CSS) ao header quando em mobile, garantindo que o conteudo nao fica debaixo do notch.

**2. Input (fundo)** - Adicionar `safe-bottom` ao container do input para nao ficar debaixo do indicador home do iPhone.

### Alteracao

**Ficheiro:** `src/components/otto/OttoChatWindow.tsx`

- Na `div` do header (linha 63): adicionar a classe `pt-safe` condicionalmente quando `isMobile` for true, para empurrar o conteudo para baixo do notch
- Na `div` do input (linha 124): adicionar a classe `pb-safe` condicionalmente quando `isMobile` for true, para o input nao ficar tapado pelo indicador home

A logica sera simples - usar as classes CSS utilitarias ja definidas no `index.css` (`pt-safe` e `pb-safe`) que utilizam `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.

### Resultado

- O header do Otto fica abaixo do notch/Dynamic Island no iPhone
- O input fica acima do indicador home
- Sem impacto no desktop (as variaveis de safe area retornam 0)

