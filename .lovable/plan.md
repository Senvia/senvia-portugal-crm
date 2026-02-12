

# Atualizar Detalhes da Venda em Tempo Real

## Problema
Quando a fatura e emitida com sucesso, o `queryClient.invalidateQueries(["sales"])` atualiza a lista de vendas em cache, mas o modal de detalhes continua a mostrar o objeto antigo (onde `invoicexpress_id` e `null`). Os botoes "Emitir Fatura" nao desaparecem porque o estado `selectedSale` no `Sales.tsx` e uma copia estatica que nunca se atualiza.

## Solucao
Sincronizar o `selectedSale` com os dados mais recentes do cache do React Query. Quando a lista de vendas e re-fetched apos a emissao, o modal deve automaticamente refletir o novo estado.

## Alteracao

### `src/pages/Sales.tsx`

Adicionar um `useEffect` que mantem o `selectedSale` sincronizado com os dados frescos da query `sales`:

```typescript
// Sync selectedSale with fresh data from React Query cache
useEffect(() => {
  if (selectedSale && sales) {
    const fresh = sales.find(s => s.id === selectedSale.id);
    if (fresh && fresh !== selectedSale) {
      setSelectedSale(fresh);
    }
  }
}, [sales]);
```

Isto garante que:
- Quando a fatura e emitida, o `onSuccess` invalida o cache `["sales"]`
- O React Query refaz o fetch da lista
- O `useEffect` detecta dados novos e atualiza o `selectedSale`
- O modal re-renderiza com `invoicexpress_id` preenchido
- Os botoes "Emitir" desaparecem e as acoes da fatura ficam disponiveis

### Resultado
Apos emitir uma fatura ou fatura-recibo, o rodape do modal atualiza automaticamente sem precisar fechar e reabrir.

