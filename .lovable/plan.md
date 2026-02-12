
# Fix: Inserir NC do KeyInvoice na tabela credit_notes

## Problema raiz

Apos o `setDocumentVoid` com sucesso, a resposta da API KeyInvoice e apenas:
```json
{"Status":1,"Data":{"Voided":1,"Message":"Documento anulado com sucesso"}}
```

Nao contem ID nem referencia da nota de credito gerada. O edge function usa fallbacks incorretos e nao loga erros do upsert.

## Alteracoes

### 1. `supabase/functions/create-credit-note/index.ts`

Corrigir o bloco KeyInvoice (apos void com sucesso):

**a) Obter client_name e total da fatura original na tabela `invoices`** em vez de tentar ler do `raw_data` com campo errado:
```typescript
// Antes (errado):
const invoiceClientName = invoiceRecord ? (invoiceRecord.raw_data as any)?.clientName || null : null
const invoiceTotal = invoiceRecord ? (invoiceRecord.raw_data as any)?.total || null : null

// Depois (correto):
// Buscar diretamente dos campos da tabela invoices
const { data: invoiceInfo } = await supabase
  .from('invoices')
  .select('client_name, total')
  .eq('invoicexpress_id', original_document_id)
  .eq('organization_id', organization_id)
  .maybeSingle()
```

**b) Gerar um `invoicexpress_id` negativo unico** para NCs do KeyInvoice (que nao retorna ID), evitando conflitos:
```typescript
const kiCreditNoteId = -(original_document_id)  // negativo para distinguir
```

**c) Adicionar error handling no upsert** com log explicito:
```typescript
const { error: upsertError } = await supabase.from('credit_notes').upsert({...})
if (upsertError) {
  console.error('Failed to upsert credit note:', upsertError)
}
```

**d) Construir uma referencia mais util**: Usar o DocType/DocSeries/DocNum originais para criar algo como `"NC 47/1"` em vez de `"NC #1"`.

### Resumo das alteracoes no ficheiro

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/create-credit-note/index.ts` | Corrigir lookup de client_name/total, gerar ID unico negativo, adicionar error handling, melhorar referencia |

Nenhuma alteracao de schema ou frontend necessaria -- o problema esta inteiramente no edge function.
