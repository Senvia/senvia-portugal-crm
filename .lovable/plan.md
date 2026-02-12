

# Mover Progresso de Pagamento para a Coluna Direita

## O que aconteceu
O card de progresso de pagamento foi removido por engano. O utilizador quer que ele seja **movido** para a coluna direita, logo abaixo do card "Valor Total".

## O que fazer

### `src/components/sales/SaleDetailsModal.tsx`

1. **Adicionar o import do `Progress`** de volta (foi removido)
2. **Adicionar o bloco de progresso de pagamento** na coluna direita (`lg:col-span-2`), logo apos o card "Valor Total" (depois da linha 556), antes do "Proposta Associada"

O bloco a adicionar e o mesmo que existia antes, com a barra de progresso, total pago, em falta e agendado:

```text
Coluna Direita:
+---------------------------+
| Valor Total               |
| 397,00 EUR                |
+---------------------------+
+---------------------------+   <-- NOVO: aqui
| Pagamento                 |
| Progresso          0%     |
| [========barr========]    |
| Total Pago    Em Falta    |
| 0,00 EUR      397,00 EUR  |
| Agendado                  |
| 397,00 EUR                |
+---------------------------+
+---------------------------+
| Proposta Associada        |
+---------------------------+
```

Condicao de visibilidade: `!isTelecom && salePayments.length > 0`

O card usa `Progress`, `CreditCard` icon, e os valores de `paymentSummary` (percentage, totalPaid, remaining, totalScheduled).
