

# Corrigir labels em PT-PT no tab de Produtos

## Problemas identificados

1. **"Org default"** (linha 118) -- label em ingles misturado com a interface em portugues
2. **Descricao do card** (linha 80) -- diz "para propostas" mas os produtos sao usados em vendas, faturas e propostas

## Alteracoes

**Ficheiro: `src/components/settings/ProductsTab.tsx`**

- Linha 118: Alterar `"Org default"` para `"IVA da Org"` (claro e conciso em PT-PT)
- Linha 80 (CardDescription): Alterar de `"Gerir o catálogo de produtos e serviços para propostas."` para `"Gerir o catálogo de produtos e serviços da organização."`

Alteracao minima, apenas duas strings de texto.

