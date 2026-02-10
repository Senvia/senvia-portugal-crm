
## Corrigir: Pagamento marcado como "Pago" nao atualiza o estado da venda

### Problema

Quando adicionas um pagamento e o marcas como "Pago", o registo do pagamento e criado corretamente na tabela `sale_payments`, mas o campo `payment_status` na tabela `sales` nunca e atualizado. Ou seja, a venda continua a mostrar "Pendente" mesmo com pagamentos pagos.

### Causa

O hook `useCreateSalePayment` e `useUpdateSalePayment` invalidam as queries de `sales`, o que faz o React Query refazer o fetch. No entanto, o campo `payment_status` na tabela `sales` nao e recalculado --- apenas os dados visuais no componente `SalePaymentsList` mostram o calculo correto (via `calculatePaymentSummary`), mas o valor na base de dados permanece inalterado.

### Solucao

Criar um **trigger na base de dados** que, sempre que um pagamento e inserido, atualizado ou eliminado na tabela `sale_payments`, recalcula automaticamente o `payment_status` da venda correspondente.

### Secao Tecnica

**1. Migracao SQL -- Criar trigger de sincronizacao:**

```sql
CREATE OR REPLACE FUNCTION public.sync_sale_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sale_id uuid;
  _total_paid numeric;
  _sale_total numeric;
  _new_status text;
BEGIN
  -- Determinar o sale_id relevante
  IF TG_OP = 'DELETE' THEN
    _sale_id := OLD.sale_id;
  ELSE
    _sale_id := NEW.sale_id;
  END IF;

  -- Calcular total pago (apenas pagamentos com status 'paid')
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid
  FROM sale_payments
  WHERE sale_id = _sale_id AND status = 'paid';

  -- Obter o total da venda
  SELECT total_value INTO _sale_total
  FROM sales
  WHERE id = _sale_id;

  -- Determinar novo estado
  IF _total_paid <= 0 THEN
    _new_status := 'pending';
  ELSIF _total_paid >= _sale_total THEN
    _new_status := 'paid';
  ELSE
    _new_status := 'partial';
  END IF;

  -- Atualizar a venda
  UPDATE sales
  SET payment_status = _new_status,
      paid_date = CASE WHEN _new_status = 'paid' THEN now() ELSE NULL END
  WHERE id = _sale_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para INSERT, UPDATE e DELETE
CREATE TRIGGER trg_sync_sale_payment_status
AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_sale_payment_status();
```

**2. Nenhum ficheiro de codigo precisa de ser alterado.** O React Query ja invalida a query `["sales"]` apos criar/atualizar pagamentos, portanto a UI vai automaticamente refletir o novo `payment_status` calculado pelo trigger.

### Resultado Esperado

- Adicionar pagamento "Pago" com valor total -> venda fica com `payment_status = 'paid'`
- Adicionar pagamento parcial -> venda fica com `payment_status = 'partial'`
- Eliminar todos os pagamentos -> venda volta a `payment_status = 'pending'`
- Tudo automatico, sem necessidade de acao extra do utilizador
