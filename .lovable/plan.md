

# Mostrar faturas KeyInvoice na aba Faturas

## Problema

A aba "Faturas" no Financeiro le dados da tabela `invoices`. Essa tabela so e populada pelo `sync-invoices`, que funciona exclusivamente com a API do InvoiceXpress. O `issue-invoice` para KeyInvoice atualiza a tabela `sales` mas nunca insere na tabela `invoices`, por isso as faturas KeyInvoice nao aparecem.

## Solucao

Adicionar um INSERT na tabela `invoices` dentro do fluxo KeyInvoice do `issue-invoice`, imediatamente apos a emissao bem-sucedida.

## Alteracao

**Ficheiro:** `supabase/functions/issue-invoice/index.ts`

Apos o update da tabela `sales` (que ja existe), adicionar um upsert na tabela `invoices`:

```typescript
// Insert into invoices table so it appears in Faturas tab
const invoiceDocType = docTypeCode === 'FR' ? 'invoice_receipt' : 'invoice';
await supabase
  .from('invoices')
  .upsert({
    organization_id: organizationId,
    invoicexpress_id: docNum,
    reference: fullDocNumber,
    document_type: invoiceDocType,
    status: 'final',
    client_name: clientName,
    total: sale.total_value,
    date: new Date().toISOString().split('T')[0],
    due_date: null,
    sale_id: saleId,
    payment_id: null,
    pdf_path: storedPdfPath || null,
    raw_data: { source: 'keyinvoice', docType, docNum, docSeries },
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'organization_id,invoicexpress_id',
  });
```

### Mapeamento de document_type

- DocType 4 (FT) -> `'invoice'` (para corresponder ao label "Fatura" no frontend)
- DocType 34 (FR) -> `'invoice_receipt'` (para corresponder ao label "Fatura-Recibo")

### Detalhes

- Usa `upsert` com `onConflict` para evitar duplicados se a fatura for re-emitida
- Guarda `raw_data` com `source: 'keyinvoice'` para distinguir de faturas InvoiceXpress
- O `client_name` ja esta disponivel no fluxo (da venda associada)
- O `pdf_path` e preenchido se o PDF foi guardado com sucesso
- Apos o deploy, as faturas KeyInvoice aparecerao imediatamente na aba Faturas

