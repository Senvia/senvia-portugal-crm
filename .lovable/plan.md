

# Adicionar Pagamentos nas Observacoes da Fatura (KeyInvoice)

## Problema
O caminho do KeyInvoice na funcao `issue-invoice` nao gera automaticamente as observacoes com o cronograma de pagamentos. Apenas usa o parametro `observations` vindo do frontend (que normalmente esta vazio). O caminho do InvoiceXpress ja tem esta logica (linhas 740-761), mas o KeyInvoice nao.

## Alteracao

### `supabase/functions/issue-invoice/index.ts`

Antes de montar o `insertPayload` (linha ~342), adicionar a mesma logica de auto-geracao de observacoes que ja existe no caminho InvoiceXpress:

```typescript
// Antes da linha 342 (insertPayload)
let finalObservations = observations || ''
if (!finalObservations) {
  const { data: salePayments } = await supabase
    .from('sale_payments')
    .select('amount, payment_date, status')
    .eq('sale_id', saleId)
    .order('payment_date', { ascending: true })

  if (salePayments && salePayments.length > 1) {
    finalObservations = `Pagamento em ${salePayments.length} parcelas:\n` +
      salePayments.map((p, i) => {
        const d = new Date(p.payment_date)
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
        return `${i+1}. ${dateStr} - ${Number(p.amount).toFixed(2)}€`
      }).join('\n')
  } else if (salePayments && salePayments.length === 1) {
    const p = salePayments[0]
    const d = new Date(p.payment_date)
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    finalObservations = `Data de pagamento: ${dateStr}`
  }
}
```

Depois, na linha 354, substituir `observations` por `finalObservations`:

```typescript
if (finalObservations) {
  insertPayload.Comments = finalObservations
}
```

Nota: Os pagamentos ja sao buscados na linha 326 para determinar o DocType, mas sem `payment_date`. Esta nova query inclui `payment_date` e ordenacao para gerar as observacoes corretamente.

