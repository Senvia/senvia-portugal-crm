

# Fix Definitivo: Otto Clicavel com Modais Abertos

## Causa Raiz
O Radix Dialog, ao abrir um modal, aplica automaticamente `pointer-events: none` a **todos os elementos irmaos** do seu portal no `<body>`. Como o Otto tambem e renderizado via `createPortal` no `<body>`, ele e tratado como um irmao e fica bloqueado.

A solucao anterior (pointer-events-none no overlay) nao resolve porque o bloqueio vem do **proprio Radix** a nivel do body, nao do overlay.

## Solucao
Forcar `pointer-events: auto !important` via inline style no container do Otto FAB e na janela de chat. O `!important` sobrescreve o estilo aplicado pelo Radix.

## Alteracoes

### 1. `src/components/otto/OttoFAB.tsx`
- Adicionar `style={{ pointerEvents: 'auto' }}` ao container raiz do portal (o fragmento nao aceita style, entao envolver num `div`)
- O div wrapper tera `position: fixed`, `z-index: 9999`, e `pointer-events: auto !important`

### 2. `src/components/otto/OttoChatWindow.tsx`
- Adicionar `style={{ pointerEvents: 'auto' }}` ao container da janela de chat

### 3. `src/components/ui/dialog.tsx`
- Reverter `pointer-events-none` do overlay (voltar ao original) pois nao era este o problema
- Manter o `onPointerDownOutside` handler para evitar fechar o dialog ao clicar no Otto

### Detalhe Tecnico

```text
// OttoFAB.tsx - container do portal
return createPortal(
  <div style={{ pointerEvents: 'auto' }} className="fixed z-[9999] ...">
    ...FAB e ChatWindow...
  </div>,
  document.body
);

// OttoChatWindow.tsx
<motion.div style={{ pointerEvents: 'auto' }} className="fixed z-[9999] ...">
```

O `style={{ pointerEvents: 'auto' }}` inline sobrescreve qualquer estilo aplicado pelo Radix Dialog, garantindo que o Otto e sempre interativo.

