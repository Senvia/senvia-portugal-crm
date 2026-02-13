

# Separar NIF Cliente vs Contribuinte Empresa + Seletor de Faturacao

## Resumo
Atualmente existe apenas um campo `nif` na tabela `crm_clients`. Precisamos separar o NIF pessoal do cliente do Contribuinte da empresa, e adicionar um seletor "Faturar Cliente" / "Faturar Empresa" que determina qual entidade e dados fiscais sao usados no payload de faturacao.

## 1. Migracao de Base de Dados

Adicionar 2 novas colunas a tabela `crm_clients`:
- `company_nif` (text, nullable) - Contribuinte/NIF da empresa
- `billing_target` (text, default `'client'`) - Valores: `'client'` ou `'company'`

## 2. Alteracoes no Tipo `CrmClient` (`src/types/clients.ts`)

- Adicionar `company_nif?: string | null`
- Adicionar `billing_target?: 'client' | 'company'`
- Criar tipo `BillingTarget = 'client' | 'company'`

## 3. Alteracoes nos Modais de Criacao e Edicao

### Coluna Esquerda - Reorganizacao dos Cards

**Card "Informacoes Basicas"** (dados pessoais do cliente):
- Nome
- Email
- Telefone
- **NIF** (NIF pessoal do cliente - campo existente `nif`)

**Card "Empresa"** (novo card separado):
- Nome da Empresa (campo existente `company`)
- **Contribuinte** (novo campo `company_nif`)

**Card "Morada"** (sem alteracao)
**Card "Notas"** (sem alteracao)

### Coluna Direita - Novo Card "Faturacao"

Novo card na coluna direita (sticky) com duas opcoes de selecao:

```text
Faturacao
---------
( ) Faturar Cliente    -> usa nome + nif do cliente
(o) Faturar Empresa   -> usa company + company_nif
```

Implementado como RadioGroup com duas opcoes visuais (cards clicaveis).

## 4. Alteracoes no Hook `useClients.ts`

- Incluir `company_nif` e `billing_target` nos payloads de criacao e atualizacao

## 5. Alteracoes no `ClientDetailsDrawer.tsx`

- Mostrar o NIF no card "Dados do Cliente" (NIF pessoal)
- Mostrar o Contribuinte no card "Empresa" (NIF da empresa)
- Indicar visualmente qual e a entidade de faturacao ativa

## Ficheiros alterados
- Migracao SQL (nova coluna `company_nif` e `billing_target`)
- `src/types/clients.ts`
- `src/components/clients/CreateClientModal.tsx`
- `src/components/clients/EditClientModal.tsx`
- `src/components/clients/ClientDetailsDrawer.tsx`
- `src/hooks/useClients.ts`

