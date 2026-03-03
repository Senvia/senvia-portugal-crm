

## Corrigir impressão geral — sidebar visível

### Problema
Na screenshot, a sidebar (com logo, OrganizationSwitcher, nome do utilizador) aparece na impressão. Isto acontece porque o seletor `[data-sidebar]` no CSS de impressão não corresponde ao componente real — o `AppSidebar` usa uma tag `<aside>`, não tem atributo `data-sidebar`.

### Solução
Adicionar `aside` à lista de seletores escondidos na secção 1 do `@media print` em `src/index.css`:

```css
/* ===== 1. Hide non-printable elements ===== */
.no-print,
aside,
[data-sidebar],
nav,
header,
[data-otto-fab],
.print\:hidden,
[data-radix-popper-content-wrapper],
[role="dialog"] {
  display: none !important;
}
```

Apenas uma linha adicionada: `aside,` — isto esconde a sidebar desktop que é um `<aside class="fixed left-0 ...">`.

### Ficheiro a editar
- `src/index.css` — linha 327, adicionar `aside,`

