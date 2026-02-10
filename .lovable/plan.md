

## Mostrar pagamentos apos criar venda

### Problema

Ao remover a secao antiga de pagamento do "Nova Venda", nao ficou nada no seu lugar. O componente `SalePaymentsList` precisa de um `sale.id` que so existe apos a venda ser criada, por isso nao pode ser mostrado durante a criacao.

### Solucao

Apos criar a venda com sucesso, **abrir automaticamente o modal de detalhes** da venda criada, onde o `SalePaymentsList` ja esta implementado. Assim o utilizador cria a venda e e imediatamente levado para adicionar pagamentos.

### Alteracoes

**Ficheiro 1: `src/components/sales/CreateSaleModal.tsx`**

- Alterar o callback `onSaleCreated` para `onSaleCreated?: (saleId: string) => void`
- Apos criar a venda com sucesso, chamar `onSaleCreated(sale.id)` passando o ID da venda criada
- O modal fecha normalmente

**Ficheiro 2: `src/pages/Sales.tsx`**

- No `CreateSaleModal`, passar um novo callback `onSaleCreated` que:
  1. Fecha o modal de criacao
  2. Define a venda criada como `selectedSale` para abrir automaticamente o `SaleDetailsModal`
- Buscar a venda completa pelo ID retornado (usando os dados ja em cache do React Query) e definir como `selectedSale`

O fluxo fica: **Criar Venda → Modal fecha → Modal de Detalhes abre automaticamente → Utilizador adiciona pagamentos**

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Callback `onSaleCreated` passa o `sale.id` |
| `src/pages/Sales.tsx` | Recebe o ID, fecha criacao e abre detalhes automaticamente |

