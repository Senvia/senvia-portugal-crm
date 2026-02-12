

# Corrigir Geracao de Recibos KeyInvoice - Usar `insertReceipt`

## Problema
A implementacao atual usa `insertDocument` com `DocType: '10'` para criar um documento avulso como recibo. Isto esta errado - o KeyInvoice tem um metodo dedicado `insertReceipt` que cria recibos vinculados a fatura original, liquidando parcialmente o seu valor.

## O Que Muda

### `supabase/functions/generate-receipt/index.ts`

Substituir todo o bloco KeyInvoice (linhas 172-435) pela logica correta:

1. **Remover** toda a logica de produtos (listProducts, insertProduct) - nao e necessaria para `insertReceipt`
2. **Remover** toda a logica de `insertDocument` com DocType 10
3. **Buscar** os dados da fatura original da tabela `invoices` (DocType, DocSeries, DocNum guardados em `raw_data`)
4. **Chamar** o metodo `insertReceipt` com os parametros corretos

### Novo Fluxo KeyInvoice

```text
1. Autenticar (getSid)
2. Resolver cliente (insertClient / listClients) - manter para IdClient
3. Buscar invoice da tabela invoices WHERE sale_id = sale_id
   -> Extrair raw_data.docType, raw_data.docSeries, raw_data.docNum
4. Chamar insertReceipt:
   {
     method: "insertReceipt",
     IdClient: keyInvoiceClientId,
     DocLines: [{
       DocType: raw_data.docType,    // ex: "4" (FT) ou "34" (FR)
       DocSeries: raw_data.docSeries, // ex: "52"
       DocNum: raw_data.docNum,       // ex: "2"
       SettleValue: payment.amount    // valor parcial do pagamento
     }]
   }
5. Resposta: {DocType, DocSeries, DocNum, FullDocNumber}
6. Obter PDF via getDocumentPDF (DocType do recibo retornado)
7. Guardar PDF no bucket invoices
8. Atualizar sale_payments com referencia do recibo
```

### Detalhes Tecnicos

- O `insertReceipt` vincula automaticamente o recibo a fatura original, liquidando o valor parcial (`SettleValue`)
- Nao precisa de produtos nem de linhas de produto - as DocLines referenciam documentos existentes
- O DocType retornado na resposta do `insertReceipt` sera usado para obter o PDF
- Se o cliente for consumidor final (sem NIF), usar Name/Address/PostalCode/Locality em vez de IdClient
- Manter a logica de resolucao de cliente (insertClient/listClients) para obter o IdClient

### Campos Necessarios da BD

A tabela `invoices` ja guarda `raw_data` com `{ source: 'keyinvoice', docType, docSeries, docNum }` - nao precisa de migracoes.
