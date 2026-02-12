
# Fix: NC do KeyInvoice em falta na tabela credit_notes

## Problema

A nota de credito do KeyInvoice (sale `983dafb3`, `credit_note_id: 1`, referencia "NC #1") foi emitida por uma versao anterior do edge function que nao fazia o `upsert` na tabela `credit_notes`. O registo nunca foi criado, por isso nao aparece na pagina de Faturas.

A versao actual do edge function ja faz o upsert, mas a NC antiga continua em falta.

## Solucao

### 1. Inserir o registo em falta via migracao SQL

Inserir diretamente na tabela `credit_notes` o registo correspondente a NC ja emitida:

```sql
INSERT INTO credit_notes (organization_id, invoicexpress_id, reference, status, client_name, total, date, related_invoice_id, sale_id)
VALUES (
  '06fe9e1d-9670-45b0-8717-c5a6e90be380',
  -1,
  'NC 47/1',
  'settled',
  'Geovane Felix',
  100,
  CURRENT_DATE,
  1,
  '983dafb3-9497-4c16-af6c-c12fdba84239'
)
ON CONFLICT (invoicexpress_id, organization_id) DO NOTHING;
```

Tambem atualizar a referencia na tabela `sales` de "NC #1" para "NC 47/1":

```sql
UPDATE sales SET credit_note_reference = 'NC 47/1', credit_note_id = -1 WHERE id = '983dafb3-9497-4c16-af6c-c12fdba84239';
```

### 2. Nenhuma alteracao de codigo necessaria

O edge function `create-credit-note` ja tem o upsert correto com ID negativo e lookup de `client_name`/`total` na tabela `invoices`. Futuras NCs do KeyInvoice serao registadas automaticamente.

## Resumo

| Alteracao | Detalhe |
|---|---|
| Migracao SQL | Inserir registo NC em falta + corrigir referencia na sale |
| Edge function | Sem alteracao (ja corrigido) |
| Frontend | Sem alteracao |
