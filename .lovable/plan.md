

## Corrigir URL no rodape de impressao

O browser usa `document.title` para o cabecalho/rodape das paginas impressas. Apenas o `PrintCardButton` altera o titulo para "Senvia OS" antes de imprimir. Os outros dois pontos que chamam `window.print()` nao fazem isso.

### Alteracoes

1. **`src/components/dashboard/DashboardPeriodFilter.tsx`** — No `handlePrintAll`, alterar `document.title` para "Senvia OS" antes de `window.print()` e restaurar depois.

2. **`src/components/finance/BankAccountStatementDrawer.tsx`** — Mesmo padrao no `onClick` do botao de impressao.

3. **`src/components/proposals/ProposalDetailsModal.tsx`** — Na funcao que abre `printWindow`, definir `printWindow.document.title = "Senvia OS"`.

Isto garante que em qualquer ponto de impressao do sistema, o browser mostra "Senvia OS" no cabecalho/rodape em vez do URL.

> **Nota:** O rodape com o URL e um comportamento do browser que o utilizador pode desativar manualmente nas opcoes de impressao (desmarcar "Headers and footers"). A solucao definitiva e configurar o dominio personalizado em Settings → Domains.

