

# Renomear Botao "Ver Rascunho de Recibo" para "Emitir Recibo"

## Contexto
O botao ja existe e aparece corretamente quando uma Fatura (FT) e emitida. O texto atual ("Ver Rascunho de Recibo") e confuso para o utilizador. Deve ser renomeado para "Emitir Recibo" com um icone mais adequado (Receipt em vez de Eye).

## Alteracao

### `src/components/sales/SalePaymentsList.tsx`

Linha 268-279: Alterar o texto e icone do botao:
- Icone: de `Eye` para `Receipt`
- Texto: de "Ver Rascunho de Recibo" para "Emitir Recibo"

O comportamento permanece o mesmo (abre o modal de rascunho para revisao antes da emissao).

