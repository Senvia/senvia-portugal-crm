
# Fix: NC no Financeiro + Esconder botao NC quando ja existe

## Problema 1: Nota de Credito do KeyInvoice nao aparece no Financeiro

O `sync-credit-notes` so sincroniza com o InvoiceXpress. Quando a NC e criada via KeyInvoice (`setDocumentVoid`), o `create-credit-note` guarda apenas `credit_note_id` e `credit_note_reference` na tabela `sales`, mas **nao insere um registo na tabela `credit_notes`**. Por isso, a NC nao aparece na listagem do Financeiro.

## Problema 2: Botao NC visivel mesmo com NC ja emitida

Nos componentes `SalePaymentsList`, `InvoiceDetailsModal` e `InvoiceActionsMenu`, o botao "NC" aparece sempre que existe um `invoicexpress_id`, sem verificar se ja existe `credit_note_id`.

---

## Solucao

### 1. `supabase/functions/create-credit-note/index.ts` - Inserir registo na tabela `credit_notes`

Apos o sucesso do `setDocumentVoid` no fluxo KeyInvoice, adicionar um `upsert` na tabela `credit_notes` com:
- `organization_id`
- `invoicexpress_id` = creditNoteId retornado
- `reference` = creditNoteReference
- `status` = "settled"
- `client_name` = obtido da fatura original na tabela `invoices`
- `total` = obtido da fatura original
- `date` = data actual
- `related_invoice_id` = original_document_id
- `sale_id` = sale_id recebido no body

Isto garante que a NC aparece imediatamente no Financeiro sem precisar de sync.

Tambem aplicar a mesma logica ao fluxo InvoiceXpress (ja cria no InvoiceXpress, mas nao insere na tabela local `credit_notes`).

### 2. `src/components/sales/SalePaymentsList.tsx` - Esconder botao NC

Adicionar uma prop `creditNoteId` ao componente. Na secao onde o botao NC e renderizado (linha ~264), adicionar condicao:

```
{invoicexpressId && !creditNoteId && (
```

### 3. `src/components/sales/SaleDetailsModal.tsx` - Passar creditNoteId

Passar `creditNoteId={sale.credit_note_id}` para o `SalePaymentsList`.

### 4. `src/components/sales/InvoiceDetailsModal.tsx` - Esconder botao NC

Verificar se o documento ja tem NC associada. Usar o campo `details.status` === 'canceled' ou consultar se existe `credit_note_id` na sale. A forma mais simples: adicionar props `creditNoteId` opcionais e esconder o botao quando preenchido.

### 5. `src/components/finance/InvoiceActionsMenu.tsx` - Esconder botao NC

Adicionar prop `creditNoteId` ao `InvoiceActionItem` interface e esconder o item "Nota de Credito" no menu quando ja existe.

---

## Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/create-credit-note/index.ts` | Inserir registo na tabela `credit_notes` apos sucesso (KeyInvoice + InvoiceXpress) |
| `src/components/sales/SalePaymentsList.tsx` | Adicionar prop `creditNoteId`, esconder botao NC |
| `src/components/sales/SaleDetailsModal.tsx` | Passar `creditNoteId` ao SalePaymentsList |
| `src/components/sales/InvoiceDetailsModal.tsx` | Esconder botao NC quando creditNoteId existe |
| `src/components/finance/InvoiceActionsMenu.tsx` | Esconder item NC no menu quando ja existe |
