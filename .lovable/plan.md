

# Reverter Auto-Pagamento no Pronto Pagamento

## Problema
Atualmente, ao selecionar "Pronto Pagamento", o sistema forca automaticamente o estado para "Pago". Mas o cliente pode ainda nao ter pago -- o pronto pagamento indica apenas que sera um pagamento unico (sem parcelas), nao que ja foi recebido.

## Solucao

Remover a logica `forceStatusPaid` e garantir que todos os pagamentos (pronto ou parcelado) sao criados com estado "pending" (Agendado) por defeito. O utilizador marca como pago no modulo financeiro.

## Alteracoes

### 1. `src/components/sales/AddPaymentModal.tsx`
- Remover a prop `forceStatusPaid`
- Remover o `useEffect` que forca `status = "paid"`
- Manter o estado inicial como `"pending"`
- Voltar a mostrar sempre o seletor de estado (Pago/Agendado) para todos os tipos de pagamento

### 2. `src/components/sales/AddDraftPaymentModal.tsx`
- Remover a prop `forceStatusPaid` e logica associada
- Estado inicial sempre `"pending"`

### 3. `src/components/sales/SalePaymentsList.tsx`
- Remover a passagem da prop `forceStatusPaid` ao `AddPaymentModal`

### 4. `src/components/sales/CreateSaleModal.tsx`
- Remover a passagem da prop `forceStatusPaid` ao `AddPaymentModal` e `AddDraftPaymentModal`

## Resumo
- 4 ficheiros alterados
- 0 alteracoes de base de dados
- Todos os pagamentos nascem como "Agendado" por defeito
- O utilizador decide quando marcar como "Pago" no modulo financeiro

