

## Corrigir AlertDialog demasiado grande

### Problema
O `AlertDialogContent` usa `top` + `bottom` via inline styles, o que faz o modal esticar de cima a baixo da viewport. AlertDialogs são tipicamente pequenos (confirmações) e devem adaptar-se ao conteúdo, não ocupar toda a altura.

### Solução — `src/components/ui/alert-dialog.tsx`

Alterar o posicionamento do `AlertDialogContent` para usar `h-auto` com centragem vertical, igual ao padrão do Dialog `default`:

- **Mobile**: posicionar abaixo do header com `top-[calc(3.5rem+env(safe-area-inset-top,0px)+1rem)]`, `bottom: auto`, `max-height` limitado
- **Desktop (sm+)**: centrar verticalmente com `top: 50%` + `transform: translateY(-50%)`
- Remover o `bottom` fixo do inline style — o modal deve ter `h-auto` e crescer com o conteúdo

Resultado: AlertDialogs compactos que se ajustam ao conteúdo, sem espaço vazio.

### Ficheiro
`src/components/ui/alert-dialog.tsx` — substituir o inline style por classes responsive consistentes com o Dialog default.

