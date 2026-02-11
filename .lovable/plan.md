

## Fluxo Fiscal Correto: Fatura + Recibos Parciais

### Contexto
Atualmente, cada pagamento gera um documento independente (FT ou FR). O fluxo fiscalmente correto para Portugal e:
1. Emitir **uma unica Fatura (FT)** pelo valor total da venda
2. A cada pagamento recebido, gerar um **Recibo** vinculado a essa fatura via `partial_payments`

### Novo Fluxo do Utilizador

```text
Venda criada (1.200EUR)
    |
    v
[Emitir Fatura] --> Cria FT pelo total (1.200EUR) no InvoiceXpress
    |                Guarda invoicexpress_id na tabela sales
    v
Pagamento 1 (400EUR) marcado como "Pago"
    |
    v
[Gerar Recibo] --> POST /documents/:invoice-id/partial_payments.json
    |               Gera Recibo vinculado a FT
    |               Guarda referencia do recibo no sale_payment
    v
Pagamento 2 (400EUR) marcado como "Pago"
    |
    v
[Gerar Recibo] --> Mesmo endpoint, novo recibo parcial
    |
    v
Pagamento 3 (400EUR) -- ultimo pagamento
    |
    v
[Gerar Recibo] --> Recibo final, fatura fica "settled"
```

### Alteracoes Tecnicas

**1. Refatorar a Edge Function `issue-invoice`**

O comportamento muda:
- Passa a emitir **apenas Faturas (FT)** pelo valor total da venda (nao por pagamento)
- Remove a logica de `payment_id` / `payment_amount` (documento por pagamento)
- Guarda o `invoicexpress_id` na tabela `sales`
- O parametro `document_type` deixa de ser necessario (sempre `invoice`)

**2. Nova Edge Function `generate-receipt`**

Ficheiro: `supabase/functions/generate-receipt/index.ts`

Responsabilidades:
- Receber `sale_id`, `payment_id`, `organization_id`
- Verificar que a venda ja tem `invoicexpress_id` (fatura emitida)
- Chamar `POST /documents/:invoicexpress_id/partial_payments.json` com:
  - `amount`: valor do pagamento
  - `payment_date`: data do pagamento (formato dd/mm/yyyy)
  - `payment_mechanism`: mapeamento do metodo de pagamento interno para codigos InvoiceXpress (TB, CC, MB, etc.)
- Guardar a referencia do recibo gerado no `sale_payment` (campos `invoice_reference`, `invoicexpress_id`, `invoice_file_url`)

Mapeamento de metodos de pagamento:
```text
mbway    -> MB
transfer -> TB
cash     -> NU
card     -> CC
check    -> CH
other    -> OU
```

**3. Atualizar a UI - SalePaymentsList**

Mudancas na interface:
- **Novo botao "Emitir Fatura"** no topo da secao de pagamentos (nivel da venda), visivel quando:
  - InvoiceXpress esta ativo
  - A venda ainda nao tem `invoicexpress_id`
  - O cliente tem NIF
- **Botao "Gerar Recibo"** por pagamento, visivel quando:
  - O pagamento esta "Pago"
  - A venda ja tem `invoicexpress_id` (fatura emitida)
  - O pagamento ainda nao tem `invoice_reference`
- **Remover** os botoes antigos "Fatura" e "Fatura-Recibo" por pagamento

**4. Atualizar InvoiceDraftModal**

- Adaptar para dois modos:
  - Modo "Fatura": mostra valor total da venda, usado ao emitir a fatura global
  - Modo "Recibo": mostra valor do pagamento especifico, usado ao gerar recibo

**5. Novo Hook `useGenerateReceipt`**

Ficheiro: `src/hooks/useGenerateReceipt.ts`

- Mutation que chama a edge function `generate-receipt`
- Toast de sucesso com referencia do recibo
- Invalidar queries `sales` e `sale-payments`

**6. Atualizar Hook `useIssueInvoice`**

- Simplificar: remover parametros `paymentId` e `paymentAmount`
- Passa a emitir sempre pelo total da venda

**7. Atualizar SaleDetailsModal**

- Passar `invoicexpress_id` da venda ao `SalePaymentsList` para controlar a visibilidade dos botoes de recibo

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `supabase/functions/issue-invoice/index.ts` | Editar | Simplificar para emitir FT pelo total |
| `supabase/functions/generate-receipt/index.ts` | Criar | Nova funcao para recibos parciais |
| `supabase/config.toml` | Editar | Registar `generate-receipt` |
| `src/hooks/useIssueInvoice.ts` | Editar | Simplificar parametros |
| `src/hooks/useGenerateReceipt.ts` | Criar | Hook para gerar recibos |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Novo layout com botao FT global + recibos |
| `src/components/sales/InvoiceDraftModal.tsx` | Editar | Suportar modo Fatura vs Recibo |
| `src/components/sales/SaleDetailsModal.tsx` | Editar | Passar invoicexpress_id ao payments list |

### Notas Importantes
- Faturas existentes (emitidas com o fluxo antigo) continuam a funcionar e podem ser anuladas
- A funcionalidade de anular faturas ja implementada continua valida para a FT global
- O endpoint `partial_payments` so funciona com `invoices` e `simplified_invoices` (nao com `invoice_receipts`), o que confirma que a FT global e o ponto de partida correto
- Quando o ultimo pagamento e registado e o recibo gerado, a fatura transita automaticamente para "settled" no InvoiceXpress

