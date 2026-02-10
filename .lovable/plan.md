

## Mover botão "Emitir Fatura-Recibo" para a secção de Pagamentos

### Problema

O botão "Emitir Fatura-Recibo" no footer do modal está a empurrar os botões "Editar Venda" e "Eliminar Venda" para fora da área visível, desconfigurando o layout.

### Solução

Remover o bloco de faturação InvoiceXpress do footer do `SaleDetailsModal.tsx` e movê-lo para dentro do `SalePaymentsList.tsx`, onde faz mais sentido contextualmente (a fatura está associada aos pagamentos).

### Alterações

**1. `src/components/sales/SaleDetailsModal.tsx`**

- Remover todo o bloco de faturação InvoiceXpress do footer (linhas 526-558)
- Passar as props necessárias (`hasInvoiceXpress`, `hasPaidPayments`, `sale`, `organization`) para o `SalePaymentsList`
- O footer fica apenas com os dois botões: "Editar Venda" e "Eliminar Venda"

**2. `src/components/sales/SalePaymentsList.tsx`**

- Adicionar novas props: `hasInvoiceXpress`, `invoicexpressId`, `invoiceReference`, `clientNif`, `saleId` (já existe), `organizationId` (já existe)
- Após o bloco de resumo de pagamentos (Summary), adicionar um botão pequeno e simples:
  - Se já tem fatura emitida: badge compacta "Fatura: REF" em verde
  - Se não tem fatura mas tem pagamentos pagos e InvoiceXpress ativo: botão `variant="outline" size="sm"` com ícone Receipt e texto "Emitir Fatura-Recibo"
- Importar e usar o hook `useIssueInvoice` dentro do `SalePaymentsList`

### Resultado visual

O footer do modal volta a ter apenas dois botões lado a lado. O botão de faturação fica integrado na secção de pagamentos, contextualmente correto e sem desconfigurar o layout.

| Ficheiro | Alteração |
|---|---|
| `SaleDetailsModal.tsx` | Remover bloco faturação do footer, passar props ao SalePaymentsList |
| `SalePaymentsList.tsx` | Adicionar botão "Emitir Fatura-Recibo" após o resumo de pagamentos |

