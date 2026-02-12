

# Emitir Recibo por Pagamento com Marcacao Automatica como Pago

## Contexto
Atualmente, o botao "Emitir Recibo" so aparece em pagamentos com status "paid". O comportamento correto e:
- Quando uma Fatura (FT) e emitida na venda, o botao "Emitir Recibo" deve aparecer em **todos os pagamentos** (pendentes, parciais ou pagos) que ainda nao tenham recibo emitido.
- Ao emitir o recibo, o pagamento e automaticamente marcado como **"Pago"**.

## Alteracoes

### 1. `src/components/sales/SalePaymentsList.tsx` (Frontend)

Remover a condicao `payment.status === 'paid'` do botao "Emitir Recibo". A nova condicao sera:

```
hasInvoiceXpress && hasInvoice && invoicexpressType === 'FT' && !payment.invoice_reference && !readonly
```

Isto faz o botao aparecer em qualquer pagamento que:
- Pertenca a uma venda com FT emitida
- Ainda nao tenha recibo emitido (sem `invoice_reference`)

### 2. `supabase/functions/generate-receipt/index.ts` (Backend)

Duas alteracoes:

**a)** Remover a validacao que bloqueia pagamentos que nao estao "paid" (linhas 132-137). Agora aceita pagamentos com qualquer status.

**b)** Apos emitir o recibo com sucesso, atualizar o status do pagamento para `'paid'` automaticamente:

```typescript
await supabase
  .from('sale_payments')
  .update({
    invoice_reference: receiptReference,
    invoicexpress_id: receiptId || null,
    status: 'paid',  // Marca automaticamente como pago
    ...(fileUrl ? { invoice_file_url: fileUrl } : {}),
    ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
  })
  .eq('id', payment_id)
```

O trigger existente `trg_sync_sale_payment_status` na base de dados ira automaticamente atualizar o `payment_status` da venda (pending/partial/paid) com base nos pagamentos atualizados.

## Resultado Final
1. Utilizador emite uma Fatura (FT) na venda
2. Botao "Emitir Recibo" aparece em cada pagamento agendado
3. Utilizador clica "Emitir Recibo" num pagamento
4. O recibo e emitido no sistema de faturacao
5. O pagamento e automaticamente marcado como "Pago"
6. O estado da venda atualiza automaticamente via trigger
