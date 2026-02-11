

## Corrigir Associacao de Faturas Criadas no Senvia OS

### Problema

Todas as faturas foram criadas internamente no Senvia, mas aparecem com icone amarelo ("nao associada") porque o sistema de sincronizacao nao consegue fazer o match correcto. Ha 3 causas:

1. **Formato de referencia diferente**: O Senvia guarda `FT #250820014` (ID numerico) mas a API do InvoiceXpress devolve `3/2026` (numero sequencial). O ILIKE nao encontra match.

2. **Match por `invoicexpress_id` falha para invoice_receipts**: As vendas com tipo `invoice_receipts` guardam o ID da fatura-recibo, mas o endpoint de `invoice_receipts` na sync devolve esses mesmos IDs. O match deveria funcionar aqui, mas nao esta a acontecer porque o `generate-receipt` guarda o ID do **recibo** (receipt) no pagamento, nao o ID do documento invoice_receipt.

3. **Nao ha match por `proprietary_uid`**: A `issue-invoice` envia um `proprietary_uid: senvia-sale-{sale_id}` ao criar a fatura, mas a `sync-invoices` nunca verifica esse campo nos `raw_data` importados.

---

### Solucao

#### 1. Melhorar o matching na `sync-invoices` (3 novas estrategias)

Adicionar ao ficheiro `supabase/functions/sync-invoices/index.ts`:

**Match por `proprietary_uid`**: Verificar se o campo `raw_data` do documento contem `proprietary_uid` no formato `senvia-sale-{uuid}`. Se sim, extrair o `sale_id` directamente.

**Match por `invoicexpress_id` directo**: Comparar o `docId` importado com o `invoicexpress_id` guardado nas `sales` (funciona para faturas emitidas via `issue-invoice`).

**Match invertido por referencia**: Em vez de procurar o `seqPart` da referencia importada nos pagamentos, procurar o `docId` numerico nas referencias dos pagamentos (que guardam `FT #DOCID`).

#### 2. Corrigir dados existentes com migracao SQL

Executar um UPDATE que:
- Preencha `sale_id` nas faturas importadas cujo `invoicexpress_id` corresponde ao `invoicexpress_id` de uma venda
- Preencha `sale_id` para documentos cujo `raw_data->proprietary_uid` contem um `sale_id` valido

---

### Seccao Tecnica

**Ficheiro: `supabase/functions/sync-invoices/index.ts`**

Adicionar antes dos matches existentes (apos linha ~113):

```typescript
// Match 0: by proprietary_uid in raw_data
const proprietaryUid = doc.proprietary_uid || null
if (!matchedSaleId && proprietaryUid && proprietaryUid.startsWith('senvia-sale-')) {
  const extractedSaleId = proprietaryUid.replace('senvia-sale-', '')
  const { data: saleByUid } = await supabase
    .from('sales')
    .select('id')
    .eq('id', extractedSaleId)
    .eq('organization_id', organization_id)
    .maybeSingle()
  if (saleByUid) {
    matchedSaleId = saleByUid.id
  }
}
```

Alterar o Match 1 existente para tambem verificar o inverso (docId nos sales):

```typescript
// Match 1: by invoicexpress_id on sales (both directions)
if (!matchedSaleId) {
  const { data: sale } = await supabase
    .from('sales')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('invoicexpress_id', docId)
    .maybeSingle()
  if (sale) {
    matchedSaleId = sale.id
  }
}
```

Adicionar match por docId nas referencias dos pagamentos:

```typescript
// Match 5: by docId in payment invoice_reference (format "FT #DOCID")
if (!matchedSaleId && !matchedPaymentId) {
  const { data: payments } = await supabase
    .from('sale_payments')
    .select('id, sale_id')
    .eq('organization_id', organization_id)
    .ilike('invoice_reference', `%${docId}%`)
    .limit(1)
  if (payments && payments.length > 0) {
    matchedPaymentId = payments[0].id
    matchedSaleId = payments[0].sale_id || null
  }
}
```

**Migracao SQL** para corrigir dados existentes:

```sql
-- Match por invoicexpress_id directo
UPDATE invoices i
SET sale_id = s.id
FROM sales s
WHERE i.invoicexpress_id = s.invoicexpress_id
  AND i.organization_id = s.organization_id
  AND i.sale_id IS NULL;

-- Match por proprietary_uid nos raw_data
UPDATE invoices i
SET sale_id = s.id
FROM sales s
WHERE i.raw_data->>'proprietary_uid' = 'senvia-sale-' || s.id::text
  AND i.organization_id = s.organization_id
  AND i.sale_id IS NULL;

-- Match por docId nos invoice_reference dos pagamentos
UPDATE invoices i
SET payment_id = sp.id, sale_id = sp.sale_id
FROM sale_payments sp
WHERE sp.invoice_reference ILIKE '%' || i.invoicexpress_id::text || '%'
  AND sp.organization_id = i.organization_id
  AND i.sale_id IS NULL
  AND i.payment_id IS NULL;
```

