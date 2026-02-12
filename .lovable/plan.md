

# Remover Progresso de Pagamento da Lista de Pagamentos

## Problema
O bloco de progresso de pagamento (barra de progresso, total pago, em falta, agendado) aparece duplicado: uma vez dentro da lista de pagamentos (coluna esquerda) e outra na coluna direita onde acabamos de o colocar. O utilizador quer manter apenas o da coluna direita.

## O que fazer

### `src/components/sales/SalePaymentsList.tsx`

Remover o bloco "Summary" (linhas 385-419) que contem:
- Barra de progresso com percentagem
- Grid com "Total Pago" e "Em Falta"
- Bloco condicional "Agendado"

Tambem remover os imports que deixam de ser necessarios:
- `Progress` (se nao for usado noutro sitio do ficheiro)
- `calculatePaymentSummary` (se a variavel `summary` deixar de ser usada)

Verificar se `summary` e usado noutro ponto do componente antes de remover o import.

Resultado: a secao de pagamentos mostra apenas a lista de parcelas (cartoes individuais) e os botoes de acao, sem o resumo financeiro duplicado.

