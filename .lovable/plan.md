

## Corrigir Erro ao Eliminar Pagamento

### Problema

A tabela `invoices` tem uma foreign key `invoices_payment_id_fkey` que referencia `sale_payments(id)` com o comportamento padrao `RESTRICT`. Quando um pagamento tem uma fatura associada na tabela `invoices`, a base de dados impede a eliminacao.

### Solucao

Alterar a foreign key para usar `ON DELETE SET NULL`. Assim, ao eliminar um pagamento:
- A fatura permanece intacta na tabela `invoices` (dados fiscais nunca se perdem)
- A coluna `payment_id` na fatura passa a `NULL`, indicando que o pagamento foi removido
- A coluna `payment_id` ja e nullable, portanto nao ha risco

### Alteracao

**Migracao SQL:**
```sql
ALTER TABLE invoices
  DROP CONSTRAINT invoices_payment_id_fkey;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES sale_payments(id) ON DELETE SET NULL;
```

Nenhuma alteracao de codigo frontend e necessaria. A logica de eliminacao em `useSalePayments.ts` ja funciona correctamente — o problema e apenas a restricao na base de dados.

