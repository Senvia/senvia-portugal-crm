

## Correcao da Data de Emissao da Fatura

### Problema
Quando emites uma fatura hoje (10/02/2026), a data na fatura sai como 12/03/2026 porque:
- Para **Fatura-Recibo** (pagamento pago): o frontend nao envia `invoiceDate`, entao a edge function usa `sale.sale_date` como fallback
- Para **Fatura** (pagamento pendente): o frontend envia `payment.payment_date` (a data de vencimento do pagamento, nao a data de hoje)

Em ambos os casos, a data de emissao deveria ser **a data de hoje** (o dia em que realmente emites a fatura).

### Correcao

**`supabase/functions/issue-invoice/index.ts`** (linha 211):
- Alterar a prioridade da data: usar `invoice_date` se explicitamente enviado, senao usar **a data de hoje**
- Remover `sale.sale_date` como fallback, porque a data de emissao e sempre "hoje" por defeito
- Usar metodo seguro para obter a data local (evitar problemas de timezone com `toISOString()`)

Antes:
```
const dateSource = invoice_date || sale.sale_date || new Date().toISOString().split('T')[0]
```

Depois:
```
const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
const dateSource = invoice_date || todayStr
```

**`src/components/sales/SalePaymentsList.tsx`** (linhas 213-220):
- Remover o envio de `invoiceDate: payment.payment_date` no botao de Fatura (pagamento pendente), porque a data de emissao deve ser "hoje", nao a data de vencimento do pagamento

### Ficheiros alterados

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/issue-invoice/index.ts` | Data de emissao = hoje por defeito (sem fallback para sale_date) |
| `src/components/sales/SalePaymentsList.tsx` | Remover envio de `invoiceDate: payment.payment_date` |

