

## Remover Exibicao do PDF do Modal de Faturas

### O que muda

Remover o bloco do iframe PDF e o spinner "A preparar documento..." do modal. Tambem remover o fallback link. Manter apenas a vista de dados estruturados e os botoes de accao no footer (incluindo o botao de download PDF que abre numa nova janela).

### Alteracoes

**Ficheiro: `src/components/sales/InvoiceDetailsModal.tsx`**

1. Remover o import do `Loader2` (se nao for usado noutro sitio - mas e usado no botao de download, entao manter)
2. Remover o bloco "PDF Viewer" (linhas 345-358) - o iframe e o spinner
3. Remover o bloco "Fallback link" (linhas 361-369) - o botao "Ver no InvoiceXpress"
4. Manter tudo o resto: dados estruturados, QR code, botoes de accao no footer

Apenas 1 ficheiro editado, remocao de cerca de 25 linhas.

