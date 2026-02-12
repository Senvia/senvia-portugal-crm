

# Visualizar PDFs em vez de Descarregar

## Problema

Atualmente, todos os botoes de PDF (nas vendas e faturas) fazem download do ficheiro. O utilizador prefere visualizar o PDF diretamente no browser.

## Solucao

Criar uma funcao utilitaria `openPdfInNewTab` que gera um signed URL (quando necessario) e abre o PDF numa nova aba do browser usando `window.open`. Substituir todas as chamadas de download por esta nova funcao nos locais relevantes.

### Funcao utilitaria

**Novo ficheiro ou adicao a `src/lib/download.ts`**:

```typescript
export async function openPdfInNewTab(path: string) {
  let url = path;
  if (!path.startsWith('http')) {
    const { data, error } = await supabase.storage
      .from('invoices')
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      throw new Error('Erro ao gerar link');
    }
    url = data.signedUrl;
  }
  window.open(url, '_blank');
}
```

### Ficheiros a alterar

1. **`src/components/sales/SalePaymentsList.tsx`** -- Substituir `handlePdfDownload` por `handlePdfView` que abre em nova aba (2 locais: fatura global e recibo individual). Trocar icone de `Download` para `Eye`/`ExternalLink`.

2. **`src/components/sales/InvoiceDetailsModal.tsx`** -- Botao "Download PDF" passa a abrir em nova aba.

3. **`src/components/finance/InvoiceActionsMenu.tsx`** -- Acao "Download PDF" no menu de acoes das faturas passa a abrir em nova aba.

4. **`src/components/finance/CreditNotesContent.tsx`** -- Botao de PDF nas notas de credito passa a abrir em nova aba.

5. **`src/components/finance/InvoicesContent.tsx`** -- Botao de PDF na listagem de faturas passa a abrir em nova aba.

### Notas

- O signed URL tera duracao de 300 segundos (5 minutos) para dar tempo ao utilizador de visualizar
- O `window.open` abre o PDF no visualizador nativo do browser (Chrome, Firefox, etc. todos suportam)
- Se um ad blocker bloquear o `window.open`, adicionamos um fallback com `<a>` tag programatico
- Labels e tooltips serao atualizados de "Download PDF" para "Ver PDF"

