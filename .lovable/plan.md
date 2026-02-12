

# Corrigir: Download de PDF da fatura nao abre (path vs URL)

## Problema

O botao de download de PDF na lista de pagamentos (`SalePaymentsList`) passa um **caminho de storage** (ex: `orgId/keyinvoice_FR-47-1.pdf`) diretamente ao `downloadFileFromUrl`, que tenta fazer `fetch` desse caminho como se fosse uma URL completa. Isso resulta num ficheiro corrompido ou erro.

O `InvoiceDetailsModal` ja resolve isto corretamente -- gera um signed URL a partir do path antes de fazer download. Mas o `SalePaymentsList` nao faz essa conversao.

## Locais afetados

Dois pontos no ficheiro `src/components/sales/SalePaymentsList.tsx`:

1. **Linha ~203** -- Download do PDF da fatura global da venda (`invoicePdfUrl`)
2. **Linha ~424** -- Download do PDF do recibo individual (`payment.invoice_file_url`)

## Solucao

Criar uma funcao helper dentro do componente (ou importar como utilitario) que:
1. Verifica se o valor e um path de storage (nao comeca com `http`)
2. Se for path, gera um signed URL via `supabase.storage.from('invoices').createSignedUrl(path, 60)`
3. Usa o signed URL resultante para fazer o download via `downloadFileFromUrl`
4. Se ja for uma URL completa, usa diretamente

### Alteracao no ficheiro

**`src/components/sales/SalePaymentsList.tsx`**:

- Adicionar import do cliente Supabase
- Criar funcao `handlePdfDownload(storagePath: string, filename: string)` que converte path em signed URL antes de descarregar
- Substituir as duas chamadas diretas a `downloadFileFromUrl` por chamadas a `handlePdfDownload`

Exemplo da logica:
```typescript
const handlePdfDownload = async (path: string, filename: string) => {
  try {
    let url = path;
    if (!path.startsWith('http')) {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(path, 60);
      if (error || !data?.signedUrl) {
        toast.error('Erro ao gerar link de download');
        return;
      }
      url = data.signedUrl;
    }
    await downloadFileFromUrl(url, filename);
  } catch {
    toast.error('Erro ao fazer download');
  }
};
```

Nenhuma alteracao de base de dados ou edge functions necessaria.
