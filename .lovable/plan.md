
# Descarregar PDF da KeyInvoice para documentos sem PDF

## Problema

A fatura migrada (34 47/1) nao tem PDF armazenado (`pdf_path = null`) porque foi inserida manualmente antes do sistema de download automatico. Quando o utilizador abre os detalhes e clica em "PDF", o sistema mostra "PDF nao disponivel".

## Solucao

Modificar a edge function `get-invoice-details` para que, quando detecta um documento KeyInvoice sem PDF armazenado, tente descarrega-lo automaticamente da API KeyInvoice e guarda-lo no storage.

## Plano de implementacao

### 1. Actualizar select da organizacao

Na edge function `get-invoice-details`, adicionar os campos `keyinvoice_password`, `keyinvoice_api_url`, `keyinvoice_sid`, `keyinvoice_sid_expires_at` ao select da tabela `organizations`.

### 2. Adicionar logica de download on-demand

Dentro do bloco `if (isKeyInvoiceDoc)`, quando `invoiceRecord.pdf_path` e `null`:

1. Extrair `DocType`, `DocNum` e `DocSeries` do `raw_data` do invoice ou fazer parse da `reference` (formato "34 47/1" -> DocType=34, DocSeries=47, DocNum=1).
2. Autenticar na API KeyInvoice (reutilizar o Sid em cache ou obter novo via `authenticate`).
3. Chamar `getDocumentPDF` com os parametros extraidos.
4. Converter o Base64 recebido em binario e guardar no bucket `invoices`.
5. Actualizar `invoices.pdf_path` com o caminho do ficheiro.
6. Gerar signed URL e devolver no response.

### 3. Reutilizar logica de autenticacao existente

Copiar a funcao `getKeyInvoiceSid` ja existente em `issue-invoice/index.ts` para `get-invoice-details/index.ts` (mesma logica de cache de Sid com TTL).

## Seccao tecnica

Alteracoes no ficheiro `supabase/functions/get-invoice-details/index.ts`:

- Linha 193: Adicionar campos KeyInvoice ao select:
  ```
  .select('invoicexpress_account_name, invoicexpress_api_key, billing_provider, keyinvoice_password, keyinvoice_api_url, keyinvoice_sid, keyinvoice_sid_expires_at')
  ```

- Adicionar funcao `getKeyInvoiceSid()` (copiada de `issue-invoice`)

- Substituir bloco de PDF (linhas 244-251) por logica expandida:
  ```
  if (!invoiceRecord.pdf_path && org?.keyinvoice_password) {
    // Parse reference "34 47/1" -> DocType=34, DocSeries=47, DocNum=1
    // Authenticate -> getDocumentPDF -> upload to storage -> update invoices table
  }
  // Then generate signed URL if pdf_path exists
  ```

- O parse da referencia usa: `reference.match(/^(\d+)\s+(\d+)\/(\d+)$/)` onde grupo 1=DocType, grupo 2=DocSeries, grupo 3=DocNum. Fallback para `raw_data.docType/docNum/docSeries` se existirem.
