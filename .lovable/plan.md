

## Corrigir layout dos campos no ServicosProductsManager

O problema é o grid de 2 colunas onde a coluna da direita tem altura variável (toggle + campo condicional), causando desalinhamento visual.

### Solução

Reorganizar o layout para uma estrutura mais limpa:
- **Linha 1**: Nome do produto (esquerda) + botão apagar (direita) — já está ok
- **Linha 2**: Grid de 2 colunas com alinhamento correto:
  - Coluna esquerda: Preço Base (€) — ocupa toda a altura
  - Coluna direita: Toggle "Tem Comissão?" no topo + campo "Comissão (%)" abaixo quando ativo
- Alinhar verticalmente o label "Preço Base" com o label "Tem Comissão" usando `items-start` no grid e espaçamento consistente

### Ficheiro
`src/components/settings/ServicosProductsManager.tsx` — ajustar classes CSS do grid interno (linhas 76-118)

