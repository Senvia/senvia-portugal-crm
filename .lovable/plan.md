

## Emitir Fatura (sem recibo) para pagamentos agendados

### Contexto

Atualmente, o sistema so emite **Fatura-Recibo** (`invoice_receipts`) via InvoiceXpress, e o botao so aparece em pagamentos com status "Pago". Ha empresas que precisam de receber a **Fatura** primeiro para depois fazer o pagamento.

### Solucao

Permitir emitir dois tipos de documento:
- **Fatura** (`invoices`): para pagamentos agendados/pendentes -- o cliente paga depois de receber a fatura
- **Fatura-Recibo** (`invoice_receipts`): para pagamentos ja recebidos (comportamento atual)

### Fluxo do utilizador

```text
Pagamento com status "Agendado":
  -> Botao "Fatura" visivel
  -> Emite Fatura (documento sem recibo) com a data do agendamento
  -> Referencia: "FT 123" em vez de "FR 123"

Pagamento com status "Pago":
  -> Botao "Fatura-Recibo" visivel (como hoje)
  -> Emite Fatura-Recibo com a data do pagamento
  -> Referencia: "FR 123"
```

### Alteracoes tecnicas

**1. `supabase/functions/issue-invoice/index.ts`**

- Aceitar novo parametro `document_type`: `"invoice"` ou `"invoice_receipt"` (default: `"invoice_receipt"`)
- Aceitar parametro opcional `invoice_date` para usar a data do pagamento agendado em vez da data da venda
- Alterar o endpoint do InvoiceXpress conforme o tipo:
  - `invoice_receipt` -> `POST /invoice_receipts.json` + finalize em `/invoice_receipts/{id}/change-state.json`
  - `invoice` -> `POST /invoices.json` + finalize em `/invoices/{id}/change-state.json`
- Alterar o prefixo da referencia: `"FT"` para faturas, `"FR"` para faturas-recibo
- Guardar o tipo correto em `invoicexpress_type` na tabela sales

**2. `src/components/sales/SalePaymentsList.tsx`**

- Mostrar botao "Fatura" tambem em pagamentos com status `pending` (agendados), nao so nos `paid`
- Ao clicar em pagamento `pending`: chamar `issueInvoice` com `document_type: "invoice"` e `invoice_date` = data do agendamento
- Ao clicar em pagamento `paid`: manter comportamento atual (`document_type: "invoice_receipt"`)
- Diferenciar o label do botao: "Fatura" vs "Fatura-Recibo"

**3. `src/hooks/useIssueInvoice.ts`**

- Adicionar `document_type` e `invoice_date` opcionais ao `IssueInvoiceParams`
- Passar esses campos no body da chamada a edge function

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/issue-invoice/index.ts` | Suportar tipo `invoice` alem de `invoice_receipt`, usar data do agendamento |
| `src/hooks/useIssueInvoice.ts` | Aceitar `document_type` e `invoice_date` nos parametros |
| `src/components/sales/SalePaymentsList.tsx` | Mostrar botao em pagamentos pendentes, passar tipo correto |

