

# Adicionar Receita Manual na Pagina de Recebidos

## Contexto
O utilizador quer registar entradas manuais (ex: juros, transferencias) diretamente na secao de Pagamentos/Recebidos, nao no extrato da conta corrente.

## Solucao
Adicionar um botao "Adicionar Receita" no header da pagina de Pagamentos (`/financeiro/pagamentos`) que abre um modal para registar uma transacao manual do tipo `adjustment` (positiva) numa conta corrente selecionada.

## Alteracoes

### 1. Novo componente `AddRevenueModal.tsx`
- Ficheiro: `src/components/finance/AddRevenueModal.tsx`
- Campos do formulario:
  - **Conta Corrente**: Select com as contas ativas (usando `useActiveBankAccounts`)
  - **Valor (EUR)**: Input numerico com suporte a formato europeu (`parseLocalizedNumber`)
  - **Data**: Input de data (default: hoje)
  - **Descricao**: Input de texto obrigatorio (ex: "Juros creditados", "Transferencia recebida")
- O valor e sempre positivo (entrada de receita)
- Design mobile-first, fullscreen em mobile

### 2. Novo hook `useCreateBankTransaction` em `src/hooks/useBankAccounts.ts`
- Mutation que insere um registo em `bank_account_transactions`:
  - `type`: `'adjustment'`
  - `amount`: valor positivo
  - `running_balance`: saldo atual + amount (calculado via query antes do insert)
  - `description`: texto do utilizador
  - `transaction_date`: data selecionada
- Invalida queries: `bank-transactions`, `bank-balance`, `bank-accounts`

### 3. Botao na pagina de Pagamentos (`src/pages/finance/Payments.tsx`)
- Adicionar botao "Adicionar Receita" no header, ao lado do botao "Exportar"
- Icone: `Plus` ou `ArrowDownLeft` (entrada)
- Ao clicar, abre o `AddRevenueModal`

### 4. Sem migracao SQL necessaria
- A tabela `bank_account_transactions` ja suporta o tipo `adjustment`
- As RLS policies ja permitem INSERT para membros da organizacao

## Ficheiros a criar/alterar
- `src/components/finance/AddRevenueModal.tsx` -- novo componente
- `src/hooks/useBankAccounts.ts` -- novo hook `useCreateBankTransaction`
- `src/pages/finance/Payments.tsx` -- botao para abrir o modal

## Resultado
O utilizador podera registar receitas avulsas (juros, transferencias, etc.) diretamente na pagina de Recebidos, associando-as a uma conta corrente especifica.

