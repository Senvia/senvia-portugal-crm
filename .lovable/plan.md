
# Mostrar Botoes de Acao da Fatura Apos Emissao

## Problema
Quando a fatura e emitida com sucesso, o `invoicexpress_id` e preenchido na venda. Nesse momento, a condicao `canEmit` no rodape torna-se `false` e o bloco inteiro retorna `null` -- ou seja, nao aparece NENHUM botao de faturacao. Faltam os botoes de acao pos-emissao (ver PDF, enviar por email, ver detalhes, nota de credito).

## Solucao
Adicionar um segundo bloco condicional no rodape do `SaleDetailsModal.tsx` que aparece quando a fatura JA foi emitida (`sale.invoicexpress_id` existe). Este bloco mostrara:

1. **Download/Ver PDF** - Abre o PDF da fatura (usando `invoice_pdf_url`)
2. **Enviar por Email** - Abre o modal de envio de email com os dados do documento
3. **Ver Detalhes** - Abre o modal de detalhes da fatura
4. **Nota de Credito** - Permite emitir nota de credito (se nao existir ja uma)

## Alteracoes Tecnicas

### `src/components/sales/SaleDetailsModal.tsx`

**1. Adicionar estados para os modais de acao (junto dos outros estados existentes):**
- `invoiceEmailModal` - para o modal de envio de email
- `invoiceDetailsModal` - para o modal de detalhes
- `invoiceCreditNoteModal` - para o modal de nota de credito

**2. Adicionar imports necessarios:**
- `SendInvoiceEmailModal` de `./SendInvoiceEmailModal`
- `InvoiceDetailsModal` de `./InvoiceDetailsModal`
- `CreateCreditNoteModal` de `./CreateCreditNoteModal`
- `openPdfInNewTab` de `@/lib/download`
- Icones: `FileDown`, `Mail`

**3. Adicionar bloco de botoes pos-emissao no rodape (apos o bloco `canEmit`):**

```text
Logica condicional:
- Se hasInvoiceXpress E sale.invoicexpress_id existe E NAO tem credit_note_id:
  - Botao "Ver PDF" (se invoice_pdf_url existe)
  - Botao "Enviar Email" (se cliente tem email)
  - Botao "Ver Detalhes"
  - Botao "Nota de Credito"
```

**4. Renderizar os modais correspondentes (antes do fecho do fragmento `<>`):**
- `SendInvoiceEmailModal`
- `InvoiceDetailsModal`
- `CreateCreditNoteModal`

### Resultado
- Antes da emissao: aparecem os botoes "Ver Rascunho" e "Emitir Fatura/Fatura-Recibo"
- Apos a emissao: aparecem os botoes "Ver PDF", "Enviar Email", "Detalhes" e "Nota de Credito"
- A transicao e automatica gracas ao `useEffect` de sincronizacao que ja foi implementado
