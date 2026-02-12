

# Fix: PDF bloqueado pelo browser (ERR_BLOCKED_BY_CLIENT)

## Problema

O PDF foi descarregado com sucesso da KeyInvoice e guardado no storage -- a URL assinada existe e funciona. No entanto, ao abrir num novo separador com `window.open()`, extensoes do browser (ad blockers como uBlock Origin, AdBlock, etc.) bloqueiam o pedido porque detectam a URL do storage como "tracking" ou "terceiros".

## Solucao

Substituir `window.open(url, '_blank')` por um download programatico via `fetch()` + Blob. Este metodo nao e interceptado por ad blockers porque o download acontece via JavaScript no contexto da pagina, sem navegacao para URL externa.

## Alteracoes tecnicas

### Criar funcao utilitaria de download

Criar uma funcao reutilizavel (por exemplo em `src/lib/download.ts`) que:
1. Faz `fetch()` da URL assinada
2. Converte a resposta em Blob
3. Cria um `URL.createObjectURL()` temporario
4. Cria um elemento `<a>` invisivel com `download` attribute e clica nele programaticamente
5. Revoga o object URL apos o download

```typescript
export async function downloadFileFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
```

### Ficheiros a alterar

1. **`src/lib/download.ts`** (novo) - Funcao utilitaria de download via blob
2. **`src/components/sales/InvoiceDetailsModal.tsx`** - Substituir `window.open(details.pdf_signed_url, '_blank')` pela funcao de download
3. **`src/components/finance/InvoicesContent.tsx`** - Mesma substituicao no handler de PDF
4. **`src/components/finance/CreditNotesContent.tsx`** - Mesma substituicao
5. **`src/components/sales/SalePaymentsList.tsx`** - Mesma substituicao

Em cada ficheiro, onde houver `window.open(url, '_blank')` para PDFs, substituir por `downloadFileFromUrl(url, 'fatura.pdf')` com o nome do ficheiro baseado na referencia do documento.

