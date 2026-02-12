

# Corrigir tipo de documento: FT vs FR com base no estado do pagamento

## Problema

O sistema emite sempre **Fatura-Recibo (DocType 34)** independentemente do estado do pagamento. Quando o pagamento esta agendado/pendente, deveria emitir uma **Fatura simples (DocType 4)**.

## Regras de negocio

- Pagamento **pendente** (agendado, ainda nao pago) -> **Fatura (FT)** = DocType `4`
- Pagamento **pago** (ja recebido) -> **Fatura-Recibo (FR)** = DocType `34`

## Alteracao

**Ficheiro:** `supabase/functions/issue-invoice/index.ts`

### 1. Determinar o tipo de documento dinamicamente (antes da linha 307)

Consultar os pagamentos da venda para determinar se ha pagamentos com status `paid`:

```typescript
// Determinar DocType com base no estado de pagamento
const { data: payments } = await supabase
  .from('sale_payments')
  .select('status, amount')
  .eq('sale_id', saleId)

const totalPaid = (payments || [])
  .filter((p: any) => p.status === 'paid')
  .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

// DocType 4 = Fatura (FT), DocType 34 = Fatura-Recibo (FR)
const docType = totalPaid >= sale.total_value ? '34' : '4'
const docLabel = docType === '34' ? 'Fatura-Recibo' : 'Fatura'
console.log(`KeyInvoice: Emitting ${docLabel} (DocType ${docType}), totalPaid=${totalPaid}, saleTotal=${sale.total_value}`)
```

### 2. Usar docType dinamico no payload (linha 309)

Substituir `DocType: '34'` por `DocType: docType`

### 3. Atualizar label na resposta e nos logs

Ajustar as mensagens de sucesso para usar `docLabel` em vez de "Fatura-Recibo" hardcoded.

### 4. Atualizar o invoicexpress_type guardado na BD

O campo `invoicexpress_type` na tabela `sales` deve guardar `'FT'` ou `'FR'` conforme o tipo emitido.

## Resultado

- Pagamento agendado -> emite **Fatura (FT)** no KeyInvoice
- Pagamento ja pago -> emite **Fatura-Recibo (FR)** no KeyInvoice
- Logs indicam claramente o tipo de documento emitido
