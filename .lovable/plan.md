

# Emitir Fatura Direto (Sem Rascunho)

## Problema
Os dois botoes ("Ver Rascunho Fatura" e "Emitir Fatura/Fatura-Recibo") executam a mesma acao: abrem o modal de rascunho. O botao "Emitir" deveria chamar diretamente a emissao da fatura, sem passar pelo rascunho.

## Alteracao

### `src/components/sales/SaleDetailsModal.tsx` (linhas 678-685)

Alterar o `onClick` do botao "Emitir Fatura" / "Emitir Fatura-Recibo" para chamar diretamente a mutacao correspondente, em vez de abrir o rascunho:

**De:**
```typescript
onClick={() => setDraftMode(mode)}
```

**Para:**
```typescript
onClick={() => {
  if (mode === 'invoice_receipt') {
    issueInvoiceReceipt.mutate({ saleId: sale.id, organizationId: organization?.id || '' });
  } else {
    issueInvoice.mutate({ saleId: sale.id, organizationId: organization?.id || '' });
  }
}}
```

Tambem adicionar `disabled={issueInvoice.isPending || issueInvoiceReceipt.isPending}` ao botao e mostrar um spinner durante o loading.

O botao "Ver Rascunho Fatura" continua a abrir o modal de rascunho normalmente, para quem quiser rever os dados e adicionar observacoes antes de emitir.

