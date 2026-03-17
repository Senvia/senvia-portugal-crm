
Objetivo

Corrigir o fluxo Lead → Proposta/Venda para que, quando o cliente é criado automaticamente, ele apareça logo como selecionado no modal de criar venda.

Diagnóstico provável

O problema parece ser um race condition no frontend:
- o cliente é criado/convetido com sucesso
- o modal de venda abre imediatamente com `prefillClientId`
- mas a lista `clients` ainda não foi atualizada no `useClients()`
- o `SearchableCombobox` recebe o `value`, mas como ainda não encontra esse cliente nas `options`, visualmente parece “sem cliente selecionado”

Isto bate certo com o comportamento atual em:
- `src/pages/Leads.tsx`
- `src/components/sales/CreateSaleModal.tsx`
- `src/components/ui/searchable-combobox.tsx`

Plano de implementação

1. Tornar o modal de venda resiliente a dados ainda não refrescados
- No `CreateSaleModal`, deixar de depender apenas de `clients` já carregados para mostrar o cliente selecionado.
- Construir uma opção de fallback para o cliente pré-selecionado quando existe `prefillClientId`, mas o cliente ainda não está na query.

2. Passar dados do cliente, não só o ID
- Estender o `CreateSaleModal` para aceitar também um objeto leve do cliente pré-selecionado (ex.: `id`, `name`, `code`, `email`).
- Assim, o modal consegue mostrar imediatamente o cliente certo, mesmo antes da query refazer fetch.

3. Corrigir os pontos de entrada do fluxo
- Em `Leads.tsx`:
  - quando já existe cliente, passar esse cliente ao abrir a venda
  - quando o cliente é criado automaticamente via `convertLeadToClient`, passar o cliente devolvido no `onSuccess`
- Em `ProposalDetailsModal.tsx`:
  - quando abrir a venda a partir da proposta, passar também o `proposal.client` como fallback visual

4. Garantir que a combobox mostre o valor atual
- No `CreateSaleModal`, gerar `clientOptions` com:
  - clientes vindos da query
  - mais o cliente fallback, se faltar
- Isso garante que o `SearchableCombobox` consiga resolver o `value` para label e mostrar o selecionado corretamente.

5. Validação extra
- Rever o reset/init do modal para garantir que:
  - `clientId` continua a ser definido logo ao abrir
  - o fallback não duplica clientes quando a query atualizar depois
  - o comportamento continua normal em vendas abertas fora deste fluxo

Ficheiros a alterar

- `src/components/sales/CreateSaleModal.tsx`
- `src/pages/Leads.tsx`
- `src/components/proposals/ProposalDetailsModal.tsx`

Resultado esperado

- Ao criar/converter automaticamente um cliente e abrir a venda, o cliente aparece logo selecionado
- O utilizador deixa de ter a sensação de que “faltou associar o cliente”
- Quando a query de clientes atualizar, o fallback é substituído silenciosamente pelos dados reais, sem duplicações

Nota técnica

Eu não faria uma alteração global no `SearchableCombobox` primeiro, porque aqui o problema é de fluxo e temporização dos dados. A correção mais segura é tratar explicitamente o “prefill client” no modal de venda, onde o bug acontece.
