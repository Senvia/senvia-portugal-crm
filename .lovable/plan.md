

## Corrigir Duplicacao e Linking entre Faturas e Notas de Credito

### Problemas Identificados

1. **Documento duplicado**: A nota de credito (ID `250819561`) aparece tanto na tabela `invoices` como na tabela `credit_notes`. Isto acontece porque o InvoiceXpress pode devolver o mesmo documento no endpoint de faturas.

2. **`related_invoice_id` esta `null`**: A edge function `sync-credit-notes` tenta extrair o ID da fatura relacionada via `related_documents` da API, mas neste caso o InvoiceXpress nao esta a devolver essa informacao (o log mostra "no related_documents found").

3. **Uma fatura "Liquidada" com nota de credito**: Isto e comportamento normal do InvoiceXpress - uma fatura pode ser liquidada e depois ter uma nota de credito emitida (reembolso). O problema e que esta relacao nao e visivel na UI.

---

### Solucao

#### 1. Edge Function `sync-invoices` - Filtrar notas de credito

Apos importar documentos, verificar se o `invoicexpress_id` ja existe na tabela `credit_notes`. Se existir, nao inserir na tabela `invoices` (evita duplicacao).

Alternativamente, adicionar um check na API: se o InvoiceXpress devolver um campo `type` que indique nota de credito, ignorar.

#### 2. Edge Function `sync-credit-notes` - Melhorar extraccao do `related_invoice_id`

Quando `related_documents` esta vazio, tentar estrategias adicionais:
- Procurar na tabela `invoices` por documentos com o mesmo `client_name` e `total` (match por valor e cliente)
- Usar o endpoint `/documents/{id}/related_documents.json` da API do InvoiceXpress como fallback

#### 3. Limpar dados existentes

Executar uma migracao para:
- Remover da tabela `invoices` os registos cujo `invoicexpress_id` tambem existe em `credit_notes`
- Preencher `related_invoice_id` nas notas de credito existentes fazendo match por `client_name` + `total` na tabela `invoices`

#### 4. Frontend - Ja implementado

As colunas "N. Credito" e "Fatura Origem" ja foram adicionadas na implementacao anterior. Com os dados corrigidos, vao mostrar as referencias corretas automaticamente.

---

### Seccao Tecnica

**Ficheiro: `supabase/functions/sync-invoices/index.ts`**

Apos o upsert (linha 197-216), adicionar verificacao:
```
// Antes do upsert, verificar se este doc e uma credit note
const { data: existingCN } = await supabase
  .from('credit_notes')
  .select('id')
  .eq('organization_id', organization_id)
  .eq('invoicexpress_id', docId)
  .maybeSingle()

if (existingCN) {
  console.log(`Skipping ${docId} - already exists as credit note`)
  continue
}
```

**Ficheiro: `supabase/functions/sync-credit-notes/index.ts`**

Apos a extraccao de `related_documents` (linha 121-133), adicionar fallback:
```
// Fallback: match por client_name + total na tabela invoices
if (!relatedDocId && cnClientName && cnTotal > 0) {
  const { data: possibleInvoice } = await supabase
    .from('invoices')
    .select('invoicexpress_id')
    .eq('organization_id', organization_id)
    .eq('client_name', cnClientName)
    .eq('total', cnTotal)
    .neq('invoicexpress_id', cnId)
    .limit(1)
    .maybeSingle()

  if (possibleInvoice) {
    relatedDocId = possibleInvoice.invoicexpress_id
  }
}
```

**Migracao SQL** para limpar dados existentes:
```sql
-- Remover faturas que sao na verdade notas de credito
DELETE FROM invoices
WHERE invoicexpress_id IN (
  SELECT invoicexpress_id FROM credit_notes
);

-- Preencher related_invoice_id nas credit_notes por match client+total
UPDATE credit_notes cn
SET related_invoice_id = (
  SELECT i.invoicexpress_id FROM invoices i
  WHERE i.organization_id = cn.organization_id
    AND i.client_name = cn.client_name
    AND i.total = cn.total
    AND i.invoicexpress_id != cn.invoicexpress_id
  LIMIT 1
)
WHERE cn.related_invoice_id IS NULL;
```

