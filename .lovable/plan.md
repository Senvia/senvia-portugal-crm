

## Atualizar Anulacao de Recibos com Endpoint Correto

### Problema
O `cancel-invoice` atual usa os endpoints `/invoices/` e `/invoice_receipts/` para anular documentos. Com o novo fluxo de Fatura + Recibos Parciais, os recibos gerados via `partial_payments` sao do tipo **Receipt** e devem ser anulados com o endpoint dedicado:

```text
PUT /receipts/:receipt-id/change-state.json
Body: { "receipt": { "state": "canceled", "message": "..." } }
```

### Alteracoes

**1. Edge Function `cancel-invoice`**

Ficheiro: `supabase/functions/cancel-invoice/index.ts`

Adicionar suporte para o tipo `receipt` no mapeamento de endpoints:

| document_type | Endpoint | Body key |
|---|---|---|
| `invoice` | `/invoices/:id/change-state.json` | `invoice` |
| `invoice_receipt` | `/invoice_receipts/:id/change-state.json` | `invoice_receipt` |
| `receipt` (novo) | `/receipts/:id/change-state.json` | `receipt` |

A logica de limpeza na base de dados mantem-se igual:
- Se `payment_id`: limpa `invoice_reference`, `invoice_file_url`, `invoicexpress_id` do pagamento
- Se `sale_id`: limpa `invoicexpress_id`, `invoicexpress_type`, `invoice_reference` da venda

**2. Hook `useCancelInvoice`**

Ficheiro: `src/hooks/useCancelInvoice.ts`

Atualizar o tipo `documentType` para incluir `"receipt"`:
```text
documentType: "invoice" | "invoice_receipt" | "receipt"
```

**3. SalePaymentsList**

Ficheiro: `src/components/sales/SalePaymentsList.tsx`

Ao anular um recibo de pagamento parcial, passar `document_type: "receipt"` em vez de tentar adivinhar pelo prefixo da referencia. O fluxo atual ja passa o tipo correto para faturas globais (`invoice`), mas os recibos parciais devem usar `receipt`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `supabase/functions/cancel-invoice/index.ts` | Editar | Adicionar mapeamento para `receipt` -> `/receipts/` |
| `src/hooks/useCancelInvoice.ts` | Editar | Adicionar `"receipt"` ao tipo union |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Usar `"receipt"` como document_type para recibos parciais |

