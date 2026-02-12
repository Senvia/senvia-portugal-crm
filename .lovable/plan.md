

# Corrigir Visualizacao de Recibos KeyInvoice

## Problema

O modal "Detalhes do Recibo" esta a mostrar os dados da **fatura original** (397,00 EUR) em vez dos dados do recibo (198,50 EUR). Isto acontece por duas razoes:

1. **ID errado na BD**: O `generate-receipt` guarda `invoicexpress_id: rcDocNum` (ex: "1") no pagamento. Quando o `get-invoice-details` pesquisa `invoices WHERE invoicexpress_id = 1`, encontra a **fatura original** em vez do recibo, porque ambos podem ter o mesmo DocNum.

2. **Itens errados**: O `get-invoice-details` para KeyInvoice retorna sempre os `sale_items` (itens completos da venda), mesmo quando esta a mostrar um recibo que tem um valor diferente.

## Alteracoes

### 1. `supabase/functions/generate-receipt/index.ts`

- **Guardar o recibo na tabela `invoices`** apos a criacao com sucesso, com `raw_data` contendo `{ source: 'keyinvoice', docType: rcDocType, docSeries: rcDocSeries, docNum: rcDocNum }` e `document_type: 'receipt'`
- Usar o `id` do registo inserido como `invoicexpress_id` no `sale_payments`, ou compor um identificador unico (ex: prefixo "RC-" + docNum) para nao colidir com faturas

### 2. `supabase/functions/get-invoice-details/index.ts`

- Quando `document_type === 'receipt'` em KeyInvoice, buscar os dados do pagamento (`sale_payments`) em vez dos itens da venda
- Usar `payment.amount` como total do documento
- Mostrar uma unica linha com o valor do pagamento em vez dos `sale_items` completos

### Detalhes Tecnicos

**generate-receipt (KeyInvoice path)** - Apos linha 386, inserir registo na tabela `invoices`:

```text
INSERT INTO invoices:
  - organization_id
  - sale_id
  - invoicexpress_id: rcDocNum (para consistencia)
  - document_type: 'receipt'
  - reference: fullDocNumber (ex: "9 9/1")
  - total: payment.amount
  - status: 'final'
  - date: hoje
  - raw_data: { source: 'keyinvoice', docType: rcDocType, docSeries: rcDocSeries, docNum: rcDocNum }
  - client_name
  - pdf_path: storedPdfPath
```

Atualizar `sale_payments.invoicexpress_id` com o `id` do registo na tabela `invoices` (UUID) para evitar colisoes.

**get-invoice-details (KeyInvoice path)** - Quando o `invoiceRecord.document_type === 'receipt'`:
- Usar `invoiceRecord.total` (que sera o valor do pagamento) em vez de somar sale_items
- Mostrar uma unica linha de item com descricao "Liquidacao de pagamento" e o valor do pagamento
- Manter o restante (cliente, PDF, etc.) igual

