

## Corrigir Erro do Iframe no Modal de Faturas

### Problema

O InvoiceXpress bloqueia o carregamento em iframes externos atraves de `X-Frame-Options`, por isso a tab "Documento" mostra apenas a mensagem "recusou estabelecer ligacao".

### Solucao

Remover o sistema de tabs e o iframe. A vista de dados estruturados (emitente, cliente, itens, impostos, sumario) passa a ser a unica vista, mostrada directamente sem tabs. O botao "Ver no InvoiceXpress" que ja existe no final abre o permalink numa nova janela do browser, permitindo ver o documento original quando necessario.

### Alteracoes

**Ficheiro: `src/components/sales/InvoiceDetailsModal.tsx`**

1. Remover a importacao de `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
2. Remover todo o bloco de tabs (linhas 148-383) e manter apenas o conteudo da tab "dados" (linhas 170-382) directamente no modal
3. Remover a logica condicional de tamanho do modal baseada no `permalink` - usar sempre `max-w-2xl`
4. Manter o botao "Ver no InvoiceXpress" que abre o `permalink` numa nova janela
5. Manter todos os botoes de accao no footer (PDF, Enviar, Nota Credito, Anular)

O resultado e um modal limpo com todos os dados estruturados visiveis imediatamente, sem tabs, sem iframe.
