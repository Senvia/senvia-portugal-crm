
# Fix: Download do PDF da Nota de Credito do KeyInvoice

## Problema

O edge function `create-credit-note` faz o `setDocumentVoid` com sucesso no KeyInvoice, insere o registo na tabela `credit_notes`, mas **nunca descarrega o PDF**. O campo `pdf_path` fica `null`, por isso o botao de download nao aparece na interface.

## Solucao

### 1. Adicionar download do PDF no `create-credit-note` (fluxo KeyInvoice)

Apos o `setDocumentVoid` com sucesso, chamar `getDocumentPDF` com DocType `8` (nota de credito) usando o mesmo DocSeries/DocNum do documento original. A logica:

1. Chamar `getDocumentPDF` com `DocType: '8'`, `DocNum: kiDocNum`, `DocSeries: kiDocSeries`
2. Extrair o base64 do PDF da resposta (mesma logica robusta ja usada em `get-invoice-details`)
3. Fazer upload para o bucket `invoices` com nome `{orgId}/credit_note_ki_{docSeries}_{docNum}.pdf`
4. Atualizar o campo `pdf_path` no registo `credit_notes` recem criado

### 2. Corrigir o registo existente (NC 47/1)

Executar uma migracao SQL para atualizar o `pdf_path` da NC existente apos o PDF ser descarregado manualmente (ou disparar o download via edge function de detalhes).

Alternativa mais simples: adicionar suporte de download on-demand na `CreditNotesContent` -- se `pdf_path` for null e for um registo KeyInvoice (`invoicexpress_id < 0`), oferecer um botao "Obter PDF" que chama uma edge function para descarregar.

### Abordagem escolhida: Download automatico no create + fallback on-demand

**Ficheiro: `supabase/functions/create-credit-note/index.ts`**

Apos o upsert da credit note (linha ~257), adicionar:

```typescript
// Try to download credit note PDF from KeyInvoice
try {
  const sid2 = await getKeyInvoiceSid(supabase, org, organization_id)
  const pdfPayload: Record<string, string> = {
    method: 'getDocumentPDF',
    DocType: '8', // Credit note
    DocNum: kiDocNum,
  }
  if (kiDocSeries) pdfPayload.DocSeries = kiDocSeries

  const pdfRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sid': sid2 },
    body: JSON.stringify(pdfPayload),
  })

  if (pdfRes.ok) {
    const pdfData = await pdfRes.json()
    if (pdfData.Status === 1 && pdfData.Data) {
      // Extract base64 (same robust logic from get-invoice-details)
      let base64Pdf = ''
      if (typeof pdfData.Data === 'string') {
        base64Pdf = pdfData.Data
      } else if (typeof pdfData.Data === 'object') {
        const knownKeys = ['PDF','pdf','Content','content','File','file','Base64','base64','FileContent','Document','document','PDFContent']
        for (const key of knownKeys) {
          if (pdfData.Data[key] && typeof pdfData.Data[key] === 'string') {
            base64Pdf = pdfData.Data[key]; break
          }
        }
        if (!base64Pdf) {
          for (const [key, val] of Object.entries(pdfData.Data)) {
            if (typeof val === 'string' && (val as string).length > 100) {
              base64Pdf = val as string; break
            }
          }
        }
      }

      if (base64Pdf) {
        base64Pdf = base64Pdf.replace(/^data:[^;]+;base64,/, '')
        const binaryStr = atob(base64Pdf)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

        const pdfFileName = `${organization_id}/credit_note_ki_${kiDocSeries || '0'}_${kiDocNum}.pdf`
        await supabase.storage.from('invoices').upload(pdfFileName, bytes.buffer, {
          contentType: 'application/pdf', upsert: true
        })

        // Update credit_notes with pdf_path
        await supabase.from('credit_notes')
          .update({ pdf_path: pdfFileName })
          .eq('invoicexpress_id', kiCreditNoteId)
          .eq('organization_id', organization_id)
      }
    }
  }
} catch (pdfErr) {
  console.error('KeyInvoice credit note PDF download failed:', pdfErr)
  // Non-blocking: NC was created successfully, PDF just not available
}
```

### 3. Para a NC existente (NC 47/1): SQL para corrigir manualmente

Apos deploy do edge function, disparar um pequeno script ou SQL para buscar o PDF desta NC especifica. Mas a forma mais pratica e: criar uma edge function de "fetch credit note PDF on demand" ou simplesmente re-emitir via interface (se possivel).

**Alternativa mais simples**: Atualizar o `pdf_path` manualmente executando o download via `get-invoice-details` adaptado -- mas isso exigiria mais alteracoes.

**Proposta final**: Apos o deploy, testar criando uma nova NC para validar que o PDF e descarregado automaticamente. Para a NC antiga, podemos executar um SQL update manual apos descarregar o PDF via API.

## Resumo

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/create-credit-note/index.ts` | Adicionar download do PDF apos `setDocumentVoid` (DocType 8) e upload para storage |

Nenhuma alteracao de frontend necessaria -- o componente `CreditNotesContent` ja mostra o botao de download quando `pdf_path` existe.
