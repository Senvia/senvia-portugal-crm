

# Tornar o Otto visivel por cima de Modais

## Problema
O Otto FAB usa `z-50` e os modais (Dialog overlay + content) tambem usam `z-50`. Como os modais sao renderizados via portal do Radix (aparecem depois no DOM), ficam por cima do Otto, escondendo-o completamente.

## Solucao
Aumentar o z-index do Otto FAB e da janela de chat para `z-[60]`, garantindo que ficam sempre visiveis, mesmo com modais abertos.

## Alteracoes

### Ficheiro: `src/components/otto/OttoFAB.tsx`
- Alterar `z-50` para `z-[60]` no container do botao FAB

### Ficheiro: `src/components/otto/OttoChatWindow.tsx`
- Alterar o z-index da janela de chat (se usar `z-50`) para `z-[60]`, para que a janela de conversa tambem fique por cima de modais abertos

Isto garante que o Otto e sempre acessivel, independentemente de haver modais ou drawers abertos.
