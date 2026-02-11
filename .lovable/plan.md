

## Guardar e Exibir PDF da Fatura Global

### Problema
A edge function `issue-invoice` ja faz polling do PDF apos finalizar a fatura, mas **nao guarda o URL** na tabela `sales`. O PDF URL e retornado na resposta e perdido. Resultado: nao ha botao "Download PDF" para a fatura global na interface.

### Alteracoes

**1. Migracao de Base de Dados**

Adicionar coluna `invoice_pdf_url` a tabela `sales`:

```text
ALTER TABLE public.sales ADD COLUMN invoice_pdf_url text DEFAULT NULL;
```

**2. Edge Function `issue-invoice`**

No passo 5 (guardar referencia), incluir o `invoice_pdf_url` no update:

```text
.update({
  invoicexpress_id: invoiceId,
  invoicexpress_type: 'invoices',
  invoice_reference: invoiceReference,
  ...(pdfUrl ? { invoice_pdf_url: pdfUrl } : {}),
  ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
})
```

**3. Tipos - `src/types/sales.ts`**

Adicionar `invoice_pdf_url?: string | null` a interface `Sale`.

**4. Frontend - `SalePaymentsList.tsx`**

Adicionar nova prop `invoicePdfUrl` e mostrar botao Download (icone Download) ao lado do QR Code na secao da fatura global, quando o URL existir.

**5. Frontend - `SaleDetailsModal.tsx`**

Passar `invoicePdfUrl={sale.invoice_pdf_url}` ao componente `SalePaymentsList`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| Migracao SQL | Criar | Adicionar `invoice_pdf_url` a `sales` |
| `supabase/functions/issue-invoice/index.ts` | Editar | Guardar `pdfUrl` no update da tabela |
| `src/types/sales.ts` | Editar | Adicionar `invoice_pdf_url` ao tipo `Sale` |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Nova prop + botao Download PDF para fatura |
| `src/components/sales/SaleDetailsModal.tsx` | Editar | Passar `invoicePdfUrl` ao componente |

