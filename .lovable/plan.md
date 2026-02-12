
# Corrigir Detalhes do Recibo - Valor Errado

## Problema
O recibo mostra 397,00 EUR (valor da venda inteira) em vez de 198,50 EUR (valor do pagamento).

**Causa raiz**: O recibo foi gerado antes da correcao anterior, por isso nao existe registo na tabela `invoices` com `document_type = 'receipt'`. O `payment.invoicexpress_id = 1` aponta para a fatura original (que tem 397 EUR). Quando o `get-invoice-details` procura `invoices WHERE invoicexpress_id = 1`, encontra a fatura original.

## Solucao

### `supabase/functions/get-invoice-details/index.ts`

Quando o `document_type` passado pelo frontend e `'receipt'` mas o registo encontrado na BD e uma `invoice` (nao um receipt), o sistema deve:

1. Verificar se existe um `payment_id` no request (ja e passado pelo frontend)
2. Buscar o pagamento na tabela `sale_payments` para obter o `amount` real
3. Usar esse `amount` como `displayTotal` em vez do `invoiceRecord.total`

### Alteracao concreta

Na seccao KeyInvoice (linhas 438-468), apos determinar `isReceipt`:

```text
Logica atual:
  isReceipt = invoiceRecord.document_type === 'receipt'
  displayTotal = invoiceRecord.total

Nova logica:
  isReceipt = document_type === 'receipt'  // usar o tipo do REQUEST, nao da BD
  
  Se isReceipt E existe payment_id no request:
    - Buscar sale_payments WHERE id = payment_id
    - displayTotal = payment.amount
  Senao se isReceipt:
    - displayTotal = invoiceRecord.total (fallback)
  Senao:
    - displayTotal = invoiceRecord.total (comportamento normal para faturas)
```

Isto corrige tanto recibos antigos (sem registo proprio) como recibos novos (com registo na tabela `invoices`).

### Ficheiros a alterar
- `supabase/functions/get-invoice-details/index.ts` - unica alteracao necessaria
