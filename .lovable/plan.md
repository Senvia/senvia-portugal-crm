

# Botao de Imprimir Extrato Bancario

## Objetivo
Adicionar um botao "Imprimir" no drawer do extrato bancario (`BankAccountStatementDrawer`) que permita ao utilizador imprimir ou guardar como PDF o extrato da conta corrente.

## Abordagem
Utilizar `window.print()` com estilos CSS dedicados para impressao (`@media print`), garantindo que apenas o conteudo do extrato e impresso de forma limpa e profissional.

## Alteracoes

### 1. `src/components/finance/BankAccountStatementDrawer.tsx`
- Adicionar um botao "Imprimir" no header do drawer (ao lado do titulo), usando o icone `Printer` do lucide-react
- Ao clicar, executa `window.print()`
- Envolver o conteudo do extrato numa `div` com um `id` especifico (ex: `bank-statement-print`) para targeting CSS

### 2. `src/index.css`
- Adicionar bloco `@media print` que:
  - Esconde tudo excepto o conteudo com id `bank-statement-print`
  - Remove backgrounds escuros e adapta cores para impressao (fundo branco, texto preto)
  - Mostra o nome da conta, banco e saldo no topo
  - Formata a tabela de movimentos de forma legivel em papel A4
  - Esconde botoes, sidebar, header e outros elementos de UI

## Resultado
O utilizador clica em "Imprimir", o browser abre o dialogo nativo de impressao com o extrato formatado, podendo imprimir ou guardar como PDF.

