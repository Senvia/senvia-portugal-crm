

## Corrigir tab Faturas no Financeiro para incluir faturas InvoiceXpress

### Problema atual

A tab "Faturas" no modulo Financeiro tem dois problemas:

1. **Filtro de status**: O `useAllPayments` filtra apenas vendas com `status = 'delivered'`, excluindo faturas emitidas em vendas noutros estados
2. **Fonte de dados incompleta**: A tab so mostra faturas manuais (campo `sale_payments.invoice_reference`), ignorando as faturas emitidas via InvoiceXpress (guardadas em `sales.invoice_reference` + `sales.invoicexpress_id`)

### Alteracoes

**1. `src/hooks/useAllPayments.ts`**

- Remover o filtro `.eq('sales.status', 'delivered')` (linha 30) para incluir pagamentos de vendas em qualquer estado
- Adicionar `invoice_reference` e `invoicexpress_id` ao select da relacao `sales` para saber se a venda tem fatura InvoiceXpress

**2. `src/hooks/useFinanceStats.ts`**

- Remover o filtro `.eq('sales.status', 'delivered')` (linha 38) para manter consistencia com o `useAllPayments`

**3. `src/types/finance.ts`**

- Adicionar campos ao tipo `PaymentWithSale.sale`: `invoice_reference`, `invoicexpress_id`

**4. `src/components/finance/InvoicesContent.tsx`**

- Alterar o filtro de faturas para incluir tambem pagamentos cuja **venda** tem `invoice_reference` ou `invoicexpress_id` (faturas InvoiceXpress)
- Na coluna "Referencia", mostrar a referencia da fatura do pagamento OU da venda (prioridade: pagamento > venda)
- Na coluna "Anexo", para faturas InvoiceXpress (sem ficheiro local), construir o link de download do PDF via a API do InvoiceXpress:
  - Buscar as credenciais da organizacao (account_name)
  - URL: `https://{account_name}.app.invoicexpress.com/invoice_receipts/{invoicexpress_id}.pdf`
  - Abrir num novo separador
- Para faturas manuais com ficheiro anexo, manter o comportamento atual (download do bucket `invoices`)
- Adicionar uma badge/indicador visual para distinguir faturas manuais de faturas InvoiceXpress (ex: badge "InvoiceXpress" pequena)

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `useAllPayments.ts` | Remover filtro `status = delivered`, adicionar campos InvoiceXpress ao select |
| `useFinanceStats.ts` | Remover filtro `status = delivered` |
| `types/finance.ts` | Adicionar `invoice_reference` e `invoicexpress_id` ao tipo `sale` |
| `InvoicesContent.tsx` | Mostrar faturas InvoiceXpress + manuais, botao download PDF para ambas |

