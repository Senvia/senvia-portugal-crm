

# Limpar badges de IVA obsoletas no tab de Produtos

## Contexto

A configuracao fiscal foi centralizada no sub-modulo "Fiscal" das Definicoes. Os produtos herdam automaticamente a taxa global da organizacao. Os modais de criacao e edicao ja enviam `tax_value: null` sempre. Contudo, a listagem de produtos continua a mostrar badges individuais de IVA ("IVA 23%", "Isento", "IVA da Org") como se cada produto pudesse ter uma taxa diferente -- isto e enganador e desnecessario.

## Alteracao

**Ficheiro: `src/components/settings/ProductsTab.tsx`**

Remover todo o bloco de badges de IVA (linhas 107-120 aprox.) que mostra condicionalmente "IVA X%", "Isento" ou "IVA da Org". Estas labels ja nao fazem sentido porque:

- Os produtos nao tem configuracao fiscal individual
- A taxa e sempre herdada da organizacao
- O utilizador configura o IVA global no tab "Fiscal"

As unicas badges que permanecem sao:
- **Mensal** (para produtos recorrentes)
- **Inativo** (para produtos desativados)

## Resultado

A listagem fica mais limpa e consistente, sem informacao fiscal redundante ou confusa ao nivel do produto.

