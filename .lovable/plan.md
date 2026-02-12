

# Trocar icone Eye por icone de PDF (FileText)

## Problema

O icone de "olho" (Eye) nao comunica visualmente que se trata de um PDF. Um icone de documento (FileText) faz mais sentido.

## Alteracoes

Substituir o icone `Eye` por `FileText` nos 5 ficheiros onde foi alterado:

1. **`src/components/sales/SalePaymentsList.tsx`** -- Trocar `Eye` por `FileText` nos botoes de ver PDF (fatura global e recibo individual)
2. **`src/components/sales/InvoiceDetailsModal.tsx`** -- Trocar `Eye` por `FileText` no botao "Ver PDF"
3. **`src/components/finance/InvoiceActionsMenu.tsx`** -- Trocar `Eye` por `FileText` na acao "Ver PDF"
4. **`src/components/finance/InvoicesContent.tsx`** -- Trocar `Eye` por `FileText` no botao de PDF
5. **`src/components/finance/CreditNotesContent.tsx`** -- Trocar `Eye` por `FileText` no botao de PDF

Apenas troca de icone, sem alteracao de logica.

