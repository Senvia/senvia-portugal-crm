

## Corrigir impressão geral do Dashboard

### Problema
Os seletores CSS de impressão não correspondem aos componentes reais:
- `.mobile-bottom-nav` não existe — o `MobileBottomNav` é um `<nav>` com `fixed bottom-0`
- `.otto-fab` não existe — o `OttoFAB` usa `[data-otto-fab]`
- O `MobileHeader` (`<header>` fixo) não é escondido
- O `TrialBanner` continua visível
- A sidebar desktop (`AppSidebar`) pode não ter `[data-sidebar]`

### Solução
Atualizar a secção 1 do `@media print` em `src/index.css` com seletores que realmente correspondem aos componentes do layout:

```css
/* ===== 1. Hide non-printable elements ===== */
.no-print,
[data-sidebar],
nav,
header,
[data-otto-fab],
.print\:hidden,
[data-radix-popper-content-wrapper],
[role="dialog"],
.trial-banner {
  display: none !important;
}
```

Alterações:
- **Adicionar `header`** — esconde o `MobileHeader` (que é um `<header>` fixo)
- **Adicionar `[data-otto-fab]`** — esconde o botão flutuante Otto pelo atributo correto
- **Remover `.mobile-bottom-nav`** e `.otto-fab` — não existem no código
- **Remover `button`** — estava a esconder TODOS os botões o que pode afetar o conteúdo dos widgets
- **O `nav`** já esconde o `MobileBottomNav` (é um `<nav>`)

Também remover o `main { padding-left: 0 }` para o sidebar desktop e garantir que o `pl-64` da sidebar é anulado.

### Ficheiro a editar
- `src/index.css` — secção 1 do `@media print`

