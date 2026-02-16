

# Registar Alteracoes de Saldo Inicial no Historico

## Problema Atual
Quando o saldo inicial e alterado, o trigger atual (`trg_bank_account_update_initial_balance`) simplesmente atualiza o valor da transacao existente do tipo `initial_balance`, sem deixar rasto da alteracao. O utilizador quer ver no extrato que o saldo inicial foi modificado.

## Solucao
Ao alterar o saldo inicial, alem de atualizar a transacao original, criar uma nova transacao do tipo `adjustment` que documenta a diferenca aplicada. Assim o historico mostra claramente o que aconteceu.

Exemplo: saldo inicial era 1.00 EUR, corrigido para 1376.59 EUR:
- Linha original: "Saldo Inicial" = 1376.59 EUR (atualizada)
- Nova linha: "Ajuste de Saldo Inicial (de 1,00 para 1.376,59)" = +1375.59 EUR

## Alteracoes

### 1. Migracao SQL — Atualizar a funcao `sync_initial_balance_transaction()`
Modificar a funcao do trigger para, alem de atualizar a transacao `initial_balance`, inserir uma nova transacao do tipo `adjustment` com:
- `amount`: a diferenca (NEW.initial_balance - OLD.initial_balance)
- `description`: texto descritivo, ex: "Saldo inicial alterado de X para Y"
- `transaction_date`: data atual
- `running_balance`: recalculado (valor anterior + diferenca)

```sql
CREATE OR REPLACE FUNCTION sync_initial_balance_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance THEN
    -- Atualizar a transacao original de saldo inicial
    UPDATE public.bank_account_transactions
    SET amount = NEW.initial_balance,
        running_balance = NEW.initial_balance,
        updated_at = now()
    WHERE bank_account_id = NEW.id
      AND type = 'initial_balance';

    -- Inserir registo de ajuste no historico
    INSERT INTO public.bank_account_transactions (
      organization_id, bank_account_id, type, amount,
      running_balance, description, transaction_date
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'adjustment',
      NEW.initial_balance - OLD.initial_balance,
      NEW.initial_balance,
      'Saldo inicial alterado de ' ||
        to_char(OLD.initial_balance, 'FM999G999G990D00') ||
        ' para ' ||
        to_char(NEW.initial_balance, 'FM999G999G990D00'),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

### 2. Sem alteracoes no frontend
O drawer do extrato (`BankAccountStatementDrawer`) ja exibe transacoes do tipo `adjustment` com o icone e label corretos. A nova transacao aparecera automaticamente no historico.

## Resultado
Ao editar o saldo inicial de uma conta, o extrato mostrara:
1. A linha "Saldo Inicial" com o valor corrigido
2. Uma nova linha "Ajuste" com a descricao da alteracao e o valor da diferenca

