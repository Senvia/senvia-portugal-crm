
# Adicionar Campo "Saldo Inicial" ao Modal de Edicao

## Problema
O modal "Editar Conta Corrente" nao tem o campo de Saldo Inicial, impedindo a correcao do valor que foi gravado incorretamente (1 EUR em vez de 1.376,59 EUR).

## Alteracoes

### 1. `src/components/finance/EditBankAccountModal.tsx`
- Adicionar estado `initialBalance` (string) inicializado com o valor actual da conta formatado
- Adicionar campo de input "Saldo Inicial (EUR)" no formulario (entre o IBAN e os checkboxes)
- No submit, usar `parseLocalizedNumber(initialBalance)` para converter o valor
- Enviar `initial_balance` no objecto de update

### 2. `src/hooks/useBankAccounts.ts`
- Garantir que o `UpdateBankAccountData` ja suporta `initial_balance` (ja herda de `Partial<CreateBankAccountData>` que inclui `initial_balance`, portanto nao precisa de alteracao)
- Apos atualizar o saldo inicial, invalidar tambem as queries de `bank-transactions` e `bank-balance` para refletir a mudanca

### Detalhe tecnico
- O trigger na base de dados que cria a transacao de "saldo inicial" precisa de ser verificado: ao alterar o `initial_balance` na tabela `bank_accounts`, o trigger deve atualizar a transacao correspondente do tipo `initial_balance` na tabela `bank_account_transactions`
- Se o trigger nao cobrir updates, sera necessaria uma migracao para adicionar um trigger de UPDATE que sincronize o valor
