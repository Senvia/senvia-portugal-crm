

## Revisao: Substituir `safe-top`/`safe-bottom` por `pt-safe`/`pb-safe`

### Analise

Existem **4 componentes** que usam `safe-top`/`safe-bottom` (sem minimo garantido):

| Componente | Classe atual | Acao |
|---|---|---|
| `TrialExpiredBlocker.tsx` | `safe-top safe-bottom` | Substituir por `pt-safe pb-safe` |
| `PaymentOverdueBlocker.tsx` | `safe-top safe-bottom` | Substituir por `pt-safe pb-safe` |
| `MobileHeader.tsx` | `safe-top` | **Manter** — e um header de layout, precisa apenas do safe area exato |
| `MobileBottomNav.tsx` | `safe-bottom` | **Manter** — nav de layout, padding extra ficaria visualmente incorreto |

Os **blockers** sao overlays fullscreen que funcionam como modais — devem usar `pt-safe`/`pb-safe` (com clamp e minimo 20px) para consistencia com os Dialog/AlertDialog corrigidos.

Os componentes de **layout** (header/nav) precisam do safe area exato sem padding extra, pois ja tem alturas proprias definidas.

### Alteracoes (2 ficheiros)

**1. `src/components/auth/TrialExpiredBlocker.tsx` (linha 22)**
- `safe-top safe-bottom` → `pt-safe pb-safe`

**2. `src/components/auth/PaymentOverdueBlocker.tsx` (linha 20)**
- `safe-top safe-bottom` → `pt-safe pb-safe`

### Opcao adicional: Atualizar `.safe-top` no CSS

Opcionalmente, podemos tambem atualizar a propria classe `.safe-top` no `index.css` para incluir um `clamp()` minimo, tornando-a segura por defeito:
```css
.safe-top { padding-top: clamp(0px, var(--safe-area-top), 50px); }
```
Isto nao resolve o caso de 0px mas limita o maximo. A abordagem mais segura e simplesmente usar `pt-safe` onde necessario.

