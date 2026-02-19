

# Bloquear Edicao de Vendas "Entregue" por Perfil

## Resumo
Adicionar uma nova regra em Definicoes > Vendas que bloqueia a edicao de vendas com estado "Entregue", semelhante ao bloqueio ja existente para vendas "Concluidas". Quando ativa, apenas administradores podem alterar vendas nesse estado.

## Como funciona hoje
Ja existe uma regra `lock_delivered_sales` que bloqueia vendas "Concluidas". O mecanismo e:
- Toggle em Definicoes > Vendas
- Quando ativo, o botao "Editar" desaparece e os campos ficam bloqueados
- Admins continuam a poder alterar o estado

## O que muda

### 1. Settings de Vendas (`SalesSettingsTab.tsx`)
Adicionar um novo checkbox:
- **"Bloquear edicao de vendas entregues"**
- Descricao: "Vendas com estado 'Entregue' nao podem ser editadas por utilizadores sem perfil de administrador."
- Nova propriedade: `lock_fulfilled_sales` no objeto `sales_settings`

### 2. Modal de Detalhes (`SaleDetailsModal.tsx`)
- Adicionar logica `isFulfilledAndLocked` semelhante a `isDeliveredAndLocked`
- Quando `lock_fulfilled_sales` esta ativo e o estado e `fulfilled`:
  - Esconder botao "Editar" para nao-admins
  - Bloquear alteracao de notas
  - Manter possibilidade de ver detalhes e pagamentos
  - Admins continuam com acesso total

### 3. Modal de Edicao (`EditSaleModal.tsx`)
- Verificar se a venda esta no estado `fulfilled` com lock ativo
- Se sim, impedir abertura para nao-admins

### 4. Confirmacao de estado
- Quando o utilizador muda o estado para "Entregue" e o lock esta ativo, mostrar dialogo de confirmacao (tal como ja acontece com "Concluida")

## Ficheiros alterados
- `src/components/settings/SalesSettingsTab.tsx` (novo checkbox)
- `src/components/sales/SaleDetailsModal.tsx` (logica de bloqueio)
- `src/components/sales/EditSaleModal.tsx` (verificacao de acesso)

## Sem alteracoes na base de dados
O campo `sales_settings` ja e JSONB, basta adicionar a nova propriedade `lock_fulfilled_sales`.

