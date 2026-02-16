
# Contas Correntes (Bank Accounts)

## Objetivo
Adicionar um sistema de contas correntes bancarias ao modulo financeiro. Cada organizacao pode cadastrar as suas contas bancarias, definir saldo inicial, e associar cada pagamento ou despesa a uma conta. O sistema mantem um historico completo de todos os movimentos por conta.

## Funcionalidades

### 1. Cadastro de Contas Correntes
- Nova secao em **Definicoes** ou directamente no **Financeiro** (nova tab "Contas")
- Campos por conta:
  - Nome da conta (ex: "Conta Principal")
  - Banco (ex: "Millennium BCP")
  - IBAN
  - Nome do Titular
- Possibilidade de editar e desactivar contas
- Uma conta pode ser marcada como "conta por defeito"

### 2. Saldo Inicial
- Ao criar uma conta corrente, o utilizador define o **saldo inicial**
- Esse saldo e registado como o primeiro movimento no historico ("Saldo inicial")
- O saldo actual e calculado automaticamente: saldo inicial + pagamentos recebidos - despesas

### 3. Associar Conta a Pagamentos e Despesas
- No modal **Adicionar Pagamento** (`AddPaymentModal`): novo campo "Conta Corrente" (select)
- No modal **Adicionar Despesa** (`AddExpenseModal`): novo campo "Conta Corrente" (select)
- Nos modais de edicao tambem
- Campo opcional — se nao seleccionado, o movimento fica "sem conta"

### 4. Historico / Extracto da Conta
- Nova pagina ou drawer com o extracto de cada conta
- Lista cronologica de todos os movimentos (entradas e saidas)
- Cada linha mostra: data, descricao, tipo (Pagamento/Despesa/Saldo Inicial), valor, saldo acumulado
- Filtros por periodo
- Exportar para Excel

### 5. Visao Geral das Contas
- Nova tab "Contas" no Financeiro com cards resumo de cada conta (nome, banco, saldo actual)
- Acesso rapido ao extracto de cada conta

---

## Detalhes Tecnicos

### Base de dados — Nova tabela `bank_accounts`

```text
bank_accounts
├── id (uuid, PK)
├── organization_id (uuid, FK → organizations)
├── name (text, NOT NULL) — nome da conta
├── bank_name (text) — nome do banco
├── iban (text)
├── holder_name (text) — nome do titular
├── initial_balance (numeric, default 0)
├── is_default (boolean, default false)
├── is_active (boolean, default true)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Base de dados — Nova tabela `bank_account_transactions`

```text
bank_account_transactions
├── id (uuid, PK)
├── organization_id (uuid, FK → organizations)
├── bank_account_id (uuid, FK → bank_accounts)
├── type (text) — 'initial_balance' | 'payment_in' | 'expense_out' | 'adjustment'
├── amount (numeric, NOT NULL) — positivo = entrada, negativo = saida
├── running_balance (numeric) — saldo apos este movimento
├── reference_id (uuid, nullable) — id do pagamento ou despesa
├── reference_type (text, nullable) — 'sale_payment' | 'expense'
├── description (text)
├── transaction_date (date)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Alteracoes em tabelas existentes

- `sale_payments`: adicionar coluna `bank_account_id (uuid, nullable, FK → bank_accounts)`
- `expenses`: adicionar coluna `bank_account_id (uuid, nullable, FK → bank_accounts)`

### RLS Policies
- Ambas as tabelas filtradas por `organization_id` (mesmo padrao das restantes tabelas)

### Triggers
- Ao inserir/editar um `sale_payment` com `bank_account_id`, criar/actualizar automaticamente o registo em `bank_account_transactions`
- Ao inserir/editar um `expense` com `bank_account_id`, criar/actualizar automaticamente o registo em `bank_account_transactions`
- Ao eliminar pagamento ou despesa, remover a transaccao correspondente

### Ficheiros a criar
- `src/types/bank-accounts.ts` — tipos TypeScript
- `src/hooks/useBankAccounts.ts` — CRUD de contas + transaccoes
- `src/components/finance/BankAccountsTab.tsx` — tab com lista de contas e saldos
- `src/components/finance/CreateBankAccountModal.tsx` — modal de criacao
- `src/components/finance/EditBankAccountModal.tsx` — modal de edicao
- `src/components/finance/BankAccountStatementDrawer.tsx` — extracto/historico
- Migracao SQL para as novas tabelas, colunas e triggers

### Ficheiros a alterar
- `src/pages/Finance.tsx` — adicionar tab "Contas"
- `src/components/sales/AddPaymentModal.tsx` — adicionar select de conta corrente
- `src/components/finance/AddExpenseModal.tsx` — adicionar select de conta corrente
- `src/components/finance/EditExpenseModal.tsx` — adicionar select de conta corrente
- Modais de edicao de pagamento (se existirem)

### Sequencia de implementacao
1. Migracao SQL (tabelas, RLS, triggers)
2. Tipos TypeScript
3. Hook `useBankAccounts`
4. Modais de criacao/edicao de conta
5. Tab "Contas" no Financeiro com extracto
6. Integrar select de conta nos modais de pagamento e despesa
7. Testar fluxo completo
