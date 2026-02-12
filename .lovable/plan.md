

# Adicionar "Dados da Venda" ao Modal Editar Venda

## Problema
O modal "Editar Venda" nao tem a secao "Dados da Venda" (Codigo, Data, Estado) que existe no modal "Detalhes da Venda". O utilizador quer consistencia visual entre os dois modais.

## O que fazer

### `src/components/sales/EditSaleModal.tsx`

Adicionar um Card "Dados da Venda" no topo da coluna esquerda (antes do card "Informacao Basica"), com layout identico ao do SaleDetailsModal:

- **Codigo** (read-only, font-mono)
- **Data da Venda** (mover o date picker que ja existe no card "Informacao Basica" para aqui)
- **Estado** (read-only badge com as cores do status atual - nao editavel neste modal)

O card "Informacao Basica" fica apenas com o campo **Cliente** (e o ClientFiscalCard se aplicavel).

### Estrutura do novo card

```text
Card: "Dados da Venda" (icone FileText)
  Grid 3 colunas:
    - Codigo: sale.code (read-only, font-mono)
    - Data da Venda: date picker (movido do card abaixo)
    - Estado: Badge com SALE_STATUS_COLORS (read-only)
```

### Resumo das alteracoes

1. Adicionar novo Card "Dados da Venda" antes do card "Informacao Basica"
2. Mover o campo "Data da Venda" para o novo card
3. O card "Informacao Basica" fica simplificado (apenas Cliente)
