

## Alterar fluxo: Lead Ganha → Abrir detalhes do cliente (não modal de venda)

### O que muda

Quando uma lead é marcada como "Ganha":
1. Cliente é criado automaticamente (mantém-se)
2. Em vez de abrir o `CreateSaleModal`, **navegar para a página de Clientes** com o parâmetro `highlight` (que já existe e abre o `ClientDetailsDrawer` automaticamente)
3. Mostrar um **toast de sucesso** informando que o cliente foi criado

### Alterações

**`src/pages/Leads.tsx`**:
- Remover import do `CreateSaleModal`
- Remover estados `isCreateSaleModalOpen` e `wonClientId`
- Remover o `<CreateSaleModal>` do JSX
- No bloco `isWonStage`:
  - **Cliente existente**: toast informativo + navegar para `/clients?highlight={clientId}`
  - **Cliente novo (onSuccess)**: toast "Novo cliente criado!" + navegar para `/clients?highlight={newClientId}`
- Adicionar `useNavigate` do react-router-dom (se não existir)

Resultado: o utilizador é levado à página de Clientes com o drawer de detalhes aberto, onde pode ver toda a informação do cliente, criar vendas, propostas, etc.

