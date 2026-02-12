

# Gerar Recibos Parciais - Suporte KeyInvoice + Validacao InvoiceXpress

## Problema Atual
A funcao `generate-receipt` so suporta InvoiceXpress (via `partial_payments`). Organizacoes que usam KeyInvoice nao conseguem gerar recibos. Alem disso, e necessario garantir que o recibo e sempre relativo ao valor do pagamento individual, nao ao valor total da venda.

## Analise

- **InvoiceXpress**: Ja esta correto. Usa o endpoint `partial_payments` com `payment.amount` (valor do pagamento individual). Nao precisa de alteracao funcional.
- **KeyInvoice**: Nao tem suporte na funcao atual. Precisa de um caminho novo usando `insertDocument` com DocType 10 (Recibo - RC) e o valor do pagamento como linha do documento.

## Alteracoes

### `supabase/functions/generate-receipt/index.ts`

1. **Buscar `billing_provider` da organizacao** - Alterar a query de org para incluir `billing_provider, keyinvoice_password, keyinvoice_api_url, keyinvoice_sid, keyinvoice_sid_expires_at`

2. **Routing por provider** - Se `billing_provider === 'keyinvoice'`, seguir caminho KeyInvoice; caso contrario, manter o caminho InvoiceXpress atual

3. **Caminho KeyInvoice (novo)**:
   - Autenticar via `getKeyInvoiceSid` (reutilizar a mesma logica de sessao com cache)
   - Verificar que a venda tem fatura emitida (`invoicexpress_id` na tabela sales)
   - Criar documento RC (DocType 10) via `insertDocument` com:
     - Uma unica DocLine com o valor do pagamento (`payment.amount`)
     - `IdClient` resolvido pelo NIF do cliente
     - `Comments` com nota do pagamento
   - Obter PDF via `getDocumentPDF` e armazenar no bucket `invoices`
   - Atualizar `sale_payments` com a referencia do recibo, PDF e status `paid`

4. **Caminho InvoiceXpress (existente)** - Sem alteracoes funcionais, ja usa `payment.amount` corretamente

### Detalhes Tecnicos

```text
Fluxo KeyInvoice:
  1. Authenticate (get Sid)
  2. insertDocument(DocType: '10', DocLines: [{amount}])
  3. getDocumentPDF(DocType: '10', DocNum)
  4. Upload PDF to storage
  5. Update sale_payments record
```

O DocType 10 (RC - Recibo) e o tipo correto no KeyInvoice para recibos, conforme ja mapeado no ficheiro `create-credit-note/index.ts`.

A funcao vai seguir o mesmo padrao das outras Edge Functions (issue-invoice, cancel-invoice, etc.) para detecao do provider e autenticacao KeyInvoice.
