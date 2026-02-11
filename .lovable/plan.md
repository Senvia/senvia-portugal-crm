

## Exibir o PDF da Fatura Directamente no Modal

### O que muda

Em vez do botao "Ver no InvoiceXpress", o modal passa a mostrar o PDF real do documento embebido directamente. O PDF e carregado do nosso proprio storage (sem bloqueio de iframe). Se o PDF ainda nao existir no storage, o sistema descarrega-o automaticamente do InvoiceXpress na primeira visualizacao.

### Como funciona

1. Quando o modal abre, a edge function verifica se o PDF ja existe no storage
2. Se nao existir, descarrega-o do InvoiceXpress e guarda-o
3. Devolve um signed URL (link temporario seguro) do PDF
4. O modal mostra o PDF num iframe/embed que ocupa a area principal

### Alteracoes

**Ficheiro 1: `supabase/functions/get-invoice-details/index.ts`**

- Sempre que o modal abre (nao apenas no sync), verificar se o PDF ja existe no storage
- Se existir, gerar um signed URL e devolver no campo `pdf_url`
- Se nao existir, descarregar do InvoiceXpress via `/api/pdf/{id}.json`, guardar no bucket `invoices`, e devolver o signed URL
- Novo campo na resposta: `pdf_signed_url` (URL temporario pronto a usar no iframe)

**Ficheiro 2: `src/hooks/useInvoiceDetails.ts`**

- Adicionar `pdf_signed_url: string | null` a interface `InvoiceDetailsData`

**Ficheiro 3: `src/components/sales/InvoiceDetailsModal.tsx`**

- Substituir o botao "Ver no InvoiceXpress" por um bloco de visualizacao do PDF
- Usar `<iframe src={details.pdf_signed_url} />` para embeber o PDF directamente
- O iframe ocupa a altura disponivel do modal (cerca de 500px)
- Se o PDF nao estiver disponivel (a carregar pela primeira vez), mostrar um spinner com mensagem "A preparar documento..."
- Manter o botao "Ver no InvoiceXpress" como fallback secundario caso o PDF falhe
- Manter todos os botoes de accao no footer (Download PDF, Enviar, Nota Credito, Anular)

### Resultado

O utilizador clica numa fatura e ve o documento PDF real directamente no modal, sem precisar de abrir outra janela ou tab.

