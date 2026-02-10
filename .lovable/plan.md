

## Substituir secao de Pagamento no "Nova Venda" pelo componente multi-parcela + regras de edicao

### Problema

1. O modal "Nova Venda" tem uma secao de pagamento antiga (metodo, estado, data vencimento, referencia) em vez de usar o componente `SalePaymentsList` como o "Editar Venda" ja usa.
2. O botao "Adicionar" deve desaparecer quando o valor total ja foi pago.
3. Pagamentos com status "paid" nao devem poder ser editados.

### Solucao

**Parte 1 -- CreateSaleModal: Trocar secao de pagamento**

O modal "Nova Venda" cria a venda primeiro e so depois pode ter pagamentos (porque precisa do `sale.id`). Como o `SalePaymentsList` precisa de um `saleId` existente, a abordagem sera:

- Remover toda a "Section 4: Payment" (linhas 857-939) com os campos metodo, estado, data vencimento e referencia
- Remover os states associados: `paymentMethod`, `paymentStatus`, `dueDate`, `invoiceReference`
- Remover do `handleSubmit` as referencias a `payment_method`, `payment_status`, `due_date`, `invoice_reference`
- Remover imports nao utilizados: `PAYMENT_METHODS`, `PAYMENT_METHOD_LABELS`, `PAYMENT_STATUSES`, `PAYMENT_STATUS_LABELS`, `CreditCard`, `Receipt`

Apos a venda ser criada, o utilizador usa o "Editar Venda" ou o "Detalhes da Venda" para adicionar pagamentos com o componente multi-parcela -- que e o fluxo correto e consistente.

**Parte 2 -- SalePaymentsList: Esconder "Adicionar" quando totalmente pago**

No componente `SalePaymentsList.tsx`:
- Calcular se `summary.remaining <= 0` (totalmente pago)
- Esconder o botao "Adicionar" no header quando `remaining <= 0`
- Esconder o botao "Adicionar Pagamento" no estado vazio (fallback) quando `remaining <= 0`

**Parte 3 -- SalePaymentsList: Bloquear edicao de pagamentos "paid"**

No componente `SalePaymentsList.tsx`:
- Para cada pagamento na lista, se `payment.status === 'paid'`, esconder os botoes de editar e eliminar
- Isto garante que pagamentos ja confirmados nao podem ser alterados

### Ficheiros alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Remover Section 4 (Payment), states e logica associada |
| `src/components/sales/SalePaymentsList.tsx` | Esconder "Adicionar" quando pago; bloquear edicao de pagamentos com status "paid" |

