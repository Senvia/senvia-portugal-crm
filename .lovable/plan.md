

# Ajuste do Footer do Modal de Detalhes de Venda

## O que muda

### 1. Remover o botao "Eliminar Venda"
- Remover o botao destrutivo e toda a logica associada (AlertDialog de confirmacao, estado `showDeleteConfirm`, funcao `handleDelete`, import do `useDeleteSale`)
- Isto simplifica o footer e remove uma acao perigosa de acesso facil

### 2. Mover botoes de faturacao para o footer
Os botoes "Ver Rascunho de Fatura" e "Ver Rascunho de Fatura-Recibo" estao atualmente dentro do componente `SalePaymentsList` (coluna esquerda, misturados com a lista de pagamentos). Vao ser extraidos e colocados no footer do modal, onde ficam mais visiveis e acessiveis.

O footer ficara assim:

```text
+----------------------------------------------------------+
| Footer:                                                    |
|  [Editar Venda]    [Ver Rascunho de Fatura/Fatura-Recibo] |
+----------------------------------------------------------+
```

- O botao de rascunho de fatura aparece **apenas quando** ha InvoiceXpress ativo, o cliente tem NIF, e nao existe fatura emitida (mesma logica que ja existe no `SalePaymentsList`)
- O label muda dinamicamente: "Ver Rascunho de Fatura" (se pagamentos pendentes) ou "Ver Rascunho de Fatura-Recibo" (se todos pagos)

## Ficheiro alterado

**`src/components/sales/SaleDetailsModal.tsx`**

### Detalhes tecnicos

1. Remover imports e state de delete: `useDeleteSale`, `showDeleteConfirm`, `handleDelete`, `AlertDialog` de confirmacao, icone `Trash2`
2. Adicionar estado e logica para o draft mode no `SaleDetailsModal` (mover do `SalePaymentsList`):
   - States: `draftMode`, `draftPayment`
   - Imports: `InvoiceDraftModal`, `useIssueInvoice`, `useIssueInvoiceReceipt`, `useGenerateReceipt`, icone `Eye`
   - Calcular `canEmitInvoice` (hasInvoiceXpress e clientNif e sem fatura existente e sem nota de credito)
   - Calcular o label e mode com base nos pagamentos (`allPaid`)
3. Renderizar o botao de rascunho no footer ao lado do "Editar Venda"
4. Renderizar os `InvoiceDraftModal` (FT e FR) no final do componente
5. O `SalePaymentsList` continua a mostrar os botoes de recibo individual (RC) por pagamento -- apenas o botao global de FT/FR e que sobe para o footer

