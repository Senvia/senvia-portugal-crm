

# Adicionar Progresso de Pagamento ao Modal Editar Venda

## Problema
O modal "Detalhes da Venda" tem um card "Pagamento" na coluna direita com barra de progresso, total pago e valor em falta. O modal "Editar Venda" nao tem essa informacao.

## Alteracao

### `src/components/sales/EditSaleModal.tsx`

Adicionar um card "Pagamento" (read-only) na coluna direita, entre o card "Resumo" e o card "Notas" (linha ~648), replicando o layout do SaleDetailsModal:

1. **Importar** `Progress` de `@/components/ui/progress`, `CreditCard` de `lucide-react`, e `useSalePayments` + `calculatePaymentSummary` de `@/hooks/useSalePayments`
2. **Buscar dados**: Chamar `useSalePayments(sale.id)` e calcular o resumo com `calculatePaymentSummary`
3. **Renderizar** o card com:
   - Barra de progresso com percentagem
   - Grid 2 colunas: Total Pago (verde) e Em Falta (amber)
   - Valor Agendado (se existir)
4. **Condicao**: Mostrar apenas quando `!isTelecom` e existam pagamentos (mesmo comportamento do SaleDetailsModal)

### Estrutura do card

```text
Card: "Pagamento" (icone CreditCard)
  - Progresso: barra + percentagem
  - Grid 2 cols:
    - Total Pago (verde)
    - Em Falta (amber)
  - Agendado (se > 0)
```

Nenhuma logica de edicao -- e apenas informacao visual read-only para contexto durante a edicao.

