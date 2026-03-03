

## Corrigir impressão completa do Dashboard

### Problema
Quando se clica no botão de imprimir o dashboard completo, o browser apenas imprime o que está visível no ecrã (viewport), cortando widgets e painéis que estão fora da área visível ou com overflow escondido.

### Causa
O layout do dashboard usa `overflow: hidden/auto` em containers (sidebar, scroll areas) e os widgets têm alturas fixas com gráficos SVG que não se adaptam bem à impressão. O CSS de impressão actual não força a expansão de todo o conteúdo.

### Solução
Adicionar regras CSS de impressão robustas em `src/index.css` que:

1. **Forçam todo o conteúdo visível** — removem `overflow: hidden`, `max-height`, e `height` fixos em containers
2. **Linearizam o layout** — transformam grids de 2-4 colunas numa coluna única para caber no papel A4
3. **Evitam cortes** — usam `break-inside: avoid` nos cards/widgets para não partir um widget entre duas páginas
4. **Expandem collapsibles** — forçam secções colapsáveis a ficarem abertas na impressão
5. **Adaptam cores** — garantem contraste adequado (fundo branco, texto preto) e que gráficos SVG mantêm cores

### Ficheiro a editar
- **`src/index.css`** — expandir o bloco `@media print` com regras para layout de impressão completo do dashboard

