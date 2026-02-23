

# Fix: Otto Clicavel por Cima de Modais

## Problema
O `DialogOverlay` (overlay escuro dos modais) tem `z-50` e cobre toda a tela com `fixed inset-0`. O Otto tem `z-[60]`, mas como o portal do Radix Dialog e renderizado **depois** do portal do Otto no DOM, o overlay captura todos os eventos de pointer, impedindo cliques no Otto.

## Solucao
Modificar o componente `DialogOverlay` no `src/components/ui/dialog.tsx` para nao bloquear interacoes com o Otto. A abordagem mais limpa e adicionar `pointer-events-none` ao overlay e `pointer-events-auto` ao content, combinado com um handler `onPointerDownOutside` no overlay para manter o comportamento de fechar ao clicar fora.

**Abordagem escolhida**: Subir o z-index do Otto para `z-[70]` (acima de qualquer portal de Dialog) e garantir que o overlay do Dialog usa `z-50` sem criar um stacking context que bloqueie o Otto.

## Alteracoes

### 1. `src/components/otto/OttoFAB.tsx`
- Alterar `z-[60]` para `z-[9999]` no container do FAB para garantir que fica **sempre** acima de tudo
- Adicionar `data-otto-fab` ao container para identificacao

### 2. `src/components/otto/OttoChatWindow.tsx`
- Alterar `z-[60]` para `z-[9999]` na janela de chat (tanto mobile como desktop)

### 3. `src/components/ui/dialog.tsx`
- Adicionar `onPointerDownOutside` handler ao `DialogContent` que verifica se o clique foi no Otto (via `[data-otto-fab]`) e previne o default se for
- Isto evita que o Dialog "engula" os cliques destinados ao Otto

### Resultado
O Otto ficara sempre visivel e clicavel, mesmo com modais abertos, sem quebrar o comportamento normal dos modais (fechar ao clicar fora).

