

## Corrigir Botao PDF e Remover Sincronizar

### Problema do PDF

O botao PDF verifica `details.pdf_url` que e um caminho de storage (ex: `org-id/invoice_123.pdf`), nao um URL. Depois tenta abrir como URL ou gerar signed URL manualmente. Mas a edge function ja devolve `pdf_signed_url` pronto a usar - so que o botao nao o utiliza.

### Alteracoes

**Ficheiro: `src/components/sales/InvoiceDetailsModal.tsx`**

1. **Corrigir `handleDownloadPdf`**: Usar `details.pdf_signed_url` directamente (que ja e um URL valido). Se nao existir, usar `details.pdf_url` como fallback com logica de signed URL. Remover a logica de sync como fallback.

2. **Remover botao "Sincronizar"**: Eliminar o bloco completo do botao (linhas 374-385) e a funcao `handleSync` e o import de `useSyncInvoice`. A sincronizacao ja acontece automaticamente quando a edge function e chamada (o PDF e guardado no storage em cada abertura do modal).

3. **Limpar imports**: Remover `RefreshCw` do import de lucide-react se nao for usado noutro sitio.

### Resultado

- Botao PDF abre o documento correctamente usando o signed URL
- Botao "Sincronizar" desaparece do footer
- Footer fica mais limpo com apenas os botoes relevantes
