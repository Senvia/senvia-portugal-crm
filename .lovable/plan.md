
# Fix: Descarregar PDF da KeyInvoice - Debug e Correcao

## Problema

O sistema chama `getDocumentPDF` da API KeyInvoice com sucesso (`Status === 1`, `Data` existe), mas nao consegue extrair o conteudo Base64 do PDF. O log mostra "Could not extract base64 PDF", o que significa que `pdfData.Data` e um objecto cujas chaves nao correspondem a nenhuma das tentativas actuais (`PDF`, `Content`, `File`, `Base64`).

## Solucao

Adicionar logging detalhado para identificar a estrutura exacta da resposta e expandir a logica de extraccao para cobrir mais possibilidades.

## Alteracoes tecnicas

### Ficheiro: `supabase/functions/get-invoice-details/index.ts`

**1. Adicionar logging da resposta completa** (funcao `fetchKeyInvoicePdf`, apos linha 101):

```typescript
const pdfData = await pdfRes.json()
console.log('KeyInvoice getDocumentPDF response Status:', pdfData.Status,
  'Data type:', typeof pdfData.Data,
  typeof pdfData.Data === 'object' ? 'keys: ' + JSON.stringify(Object.keys(pdfData.Data)) : '')
```

**2. Expandir a logica de extraccao do Base64** (linhas 107-118):

- Alem das chaves actuais (`PDF`, `Content`, `File`, `Base64`), adicionar verificacao de chaves em minuscula (`pdf`, `content`, `file`, `base64`) e variantes comuns (`FileContent`, `Document`, `document`, `PDFContent`).
- Se nenhuma chave conhecida funcionar, usar a **primeira propriedade string** do objecto `Data` como fallback (muitas APIs retornam o Base64 numa unica chave com nome inesperado).
- Adicionar log de warning com as chaves encontradas quando nenhuma das conhecidas funciona.

Logica expandida:
```typescript
let base64Pdf = ''
if (typeof pdfData.Data === 'string') {
  base64Pdf = pdfData.Data
} else if (typeof pdfData.Data === 'object' && pdfData.Data !== null) {
  // Try known keys (case variations)
  const knownKeys = ['PDF', 'pdf', 'Content', 'content', 'File', 'file', 
                     'Base64', 'base64', 'FileContent', 'Document', 'document', 'PDFContent']
  for (const key of knownKeys) {
    if (pdfData.Data[key] && typeof pdfData.Data[key] === 'string') {
      base64Pdf = pdfData.Data[key]
      break
    }
  }
  // Fallback: use the first string value found
  if (!base64Pdf) {
    for (const [key, val] of Object.entries(pdfData.Data)) {
      if (typeof val === 'string' && (val as string).length > 100) {
        console.log('KeyInvoice PDF: Using fallback key:', key)
        base64Pdf = val as string
        break
      }
    }
  }
}
```

### Ficheiro: `supabase/functions/issue-invoice/index.ts`

Aplicar a mesma melhoria de extraccao e logging na funcao de emissao (linhas 386-403), para garantir consistencia entre ambas as edge functions.

### Deploy

Redesplegar ambas as edge functions (`get-invoice-details` e `issue-invoice`).

## Resultado esperado

Apos o deploy, ao clicar em "PDF" na fatura 34 47/1, os logs mostrarao as chaves exactas do objecto `Data`. Com o fallback expandido, o PDF sera extraido independentemente do nome da chave utilizada pela API KeyInvoice.
