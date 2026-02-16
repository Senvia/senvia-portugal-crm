

# Formatacao Automatica do IBAN com Espacos

## Problema
O IBAN e apresentado e guardado sem formatacao, tornando-o dificil de ler (ex: `DE6510012345340314711`). O utilizador quer que apareca sempre formatado em grupos de 4 caracteres (ex: `DE65 1001 2345 3403 1471 1`).

## Solucao

### 1. Criar funcao utilitaria `formatIban` em `src/lib/format.ts`
- Remove todos os espacos e caracteres nao alfanumericos
- Agrupa em blocos de 4 caracteres separados por espaco
- Ex: `PT500018000361278248020470` -> `PT50 0018 0003 6127 8248 0204 70`

### 2. Aplicar formatacao nos inputs de IBAN (CreateBankAccountModal + EditBankAccountModal)
- No `onChange` do campo IBAN, limpar e reformatar o valor automaticamente
- O utilizador digita ou cola o IBAN e ele fica formatado em tempo real
- Antes de gravar na base de dados, remover os espacos (guardar apenas digitos/letras)

### 3. Aplicar formatacao na exibicao (BankAccountsTab - BankAccountCard)
- Usar `formatIban()` ao renderizar o IBAN no cartao da conta

## Ficheiros a alterar
- `src/lib/format.ts` — nova funcao `formatIban`
- `src/components/finance/CreateBankAccountModal.tsx` — formatar input IBAN
- `src/components/finance/EditBankAccountModal.tsx` — formatar input IBAN
- `src/components/finance/BankAccountsTab.tsx` — formatar IBAN na exibicao do cartao

