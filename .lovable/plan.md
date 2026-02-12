

# Reordenar Botoes do Footer - Detalhes da Venda

## Problema
No footer do modal "Detalhes da Venda", o botao "Editar Venda" aparece antes dos botoes de faturacao. O utilizador quer que fique entre o botao "Emitir Fatura" e o botao "Voltar".

## Alteracao

### `src/components/sales/SaleDetailsModal.tsx` (linhas 660-710)

Reordenar os blocos dentro do footer para:

1. **Ver Rascunho Fatura** + **Emitir Fatura** (bloco de faturacao - mantem-se primeiro)
2. **Editar Venda** (movido para aqui)
3. **Voltar** (mantem-se no final)

Ordem final dos botoes: `[ Ver Rascunho | Emitir Fatura | Editar Venda | Voltar ]`

Nenhuma logica e alterada, apenas a posicao dos blocos JSX dentro do `<div className="flex gap-3">`.
