

# Adicionar Botao "Voltar" no Footer

## O que fazer

### `src/components/sales/SaleDetailsModal.tsx`

Adicionar um botao "Voltar" no inicio do footer (linha 660) que fecha o modal. Fica como o primeiro botao da linha, antes dos outros 3.

Layout final:

```text
[ Voltar ]  [ Editar Venda ]  [ Ver Rascunho Fatura ]  [ Emitir Fatura ]
```

O botao "Voltar" chama `onOpenChange(false)` para fechar o modal. Usa o icone `ArrowLeft` e variante `ghost` para se distinguir visualmente dos botoes de acao.

