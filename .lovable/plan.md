

# Corrigir fatura KeyInvoice em falta na aba Faturas

## Diagnóstico

A fatura da venda 0007 (sale_id: `983dafb3-...`) foi emitida **antes** do deploy que insere registos na tabela `invoices`. Por isso, existe na tabela `sales` mas não na tabela `invoices`.

Dados actuais na tabela `sales`:
- `invoice_reference`: "34 47/1"
- `invoicexpress_type`: "keyinvoice" (valor antigo, antes da correcção FT/FR)
- `invoicexpress_id`: 1

## Acções

### 1. Inserir manualmente o registo na tabela `invoices`

Usar o insert tool para adicionar a fatura em falta:

```sql
INSERT INTO invoices (organization_id, invoicexpress_id, reference, document_type, status, client_name, total, date, sale_id, raw_data, updated_at)
SELECT 
  s.organization_id,
  s.invoicexpress_id,
  s.invoice_reference,
  'invoice_receipt',
  'final',
  COALESCE(c.name, l.name, 'Cliente'),
  s.total_value,
  s.created_at::date::text,
  s.id,
  '{"source": "keyinvoice", "migrated": true}'::jsonb,
  NOW()
FROM sales s
LEFT JOIN clients c ON c.id = s.client_id
LEFT JOIN leads l ON l.id = s.lead_id
WHERE s.id = '983dafb3-9497-4c16-af6c-c12fdba84239';
```

### 2. Corrigir o `invoicexpress_type` na tabela `sales`

O valor actual é `"keyinvoice"` (formato antigo). Actualizar para `"FR"` (Fatura-Recibo, DocType 34):

```sql
UPDATE sales 
SET invoicexpress_type = 'FR' 
WHERE id = '983dafb3-9497-4c16-af6c-c12fdba84239';
```

### 3. Validação

Após as inserções, a fatura deverá aparecer imediatamente na aba Faturas do Financeiro. Futuras emissões via KeyInvoice já são registadas automaticamente pelo código deployado.

## Secção técnica

- O campo `invoicexpress_id` na venda 0007 é `1` (número do documento no KeyInvoice). Este valor será usado no upsert para evitar duplicados futuros.
- O `document_type` é `invoice_receipt` porque o DocType original era 34 (Fatura-Recibo).
- O `raw_data` inclui `"migrated": true` para identificar registos retroactivos.

