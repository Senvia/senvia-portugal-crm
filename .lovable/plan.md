
# Atualizar estado da fatura na tabela `invoices` ao anular (KeyInvoice)

## Problema

Quando se anula uma fatura via KeyInvoice, a edge function `cancel-invoice` limpa as referências nas tabelas `sales` e `sale_payments`, mas nao atualiza o registo correspondente na tabela `invoices`. O resultado e que a fatura desaparece da listagem (porque perde o `sale_id`) ou fica com status desatualizado.

## Causa raiz

No fluxo de emissao (`issue-invoice`), o sistema insere/atualiza corretamente a tabela `invoices` (linha 462). Mas no fluxo de anulacao (`cancel-invoice`), essa tabela e ignorada.

## Solucao

Alterar a edge function `cancel-invoice` para, apos a anulacao com sucesso (tanto InvoiceXpress como KeyInvoice), atualizar o registo na tabela `invoices` com `status: 'canceled'`, em vez de apenas limpar as referências nas tabelas `sales` e `sale_payments`.

### Alteracao no ficheiro

**`supabase/functions/cancel-invoice/index.ts`**

Apos o bloco de sucesso da anulacao (depois do `if/else` do provider) e antes de limpar as referências, adicionar:

```typescript
// Update invoice status in invoices table
await supabase
  .from('invoices')
  .update({ status: 'canceled', updated_at: new Date().toISOString() })
  .eq('organization_id', organization_id)
  .eq('invoicexpress_id', invoicexpress_id)
```

Esta alteracao garante que:
1. A fatura continua visivel na listagem de Faturas
2. O status aparece como "canceled" (anulada)
3. Funciona tanto para InvoiceXpress como para KeyInvoice
