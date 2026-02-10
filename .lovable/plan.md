

## Corrigir abertura automatica do modal de detalhes apos criar venda

### Problema

O fluxo atual tenta encontrar a venda criada no cache do React Query apos 500ms, mas o `invalidateQueries` (que dispara o refetch) acontece de forma assincrona no `onSuccess` da mutation -- e frequentemente ainda nao terminou quando o `setTimeout` executa. Resultado: `sales?.find(s => s.id === saleId)` retorna `undefined` e o modal de detalhes nunca abre.

### Solucao

Usar um state `pendingSaleId` e um `useEffect` que observa quando os dados de `sales` sao atualizados. Assim que a venda aparece no cache, o modal de detalhes abre automaticamente.

### Alteracoes

**Ficheiro: `src/pages/Sales.tsx`**

1. Adicionar um novo state: `const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)`

2. Adicionar um `useEffect` que observa `sales` e `pendingSaleId`:
   - Quando `pendingSaleId` existe e `sales` contem uma venda com esse ID, define `selectedSale` com essa venda e limpa `pendingSaleId`

3. Alterar o callback `onSaleCreated` para simplesmente:
   - Fechar o modal de criacao (`setShowCreateModal(false)`)
   - Definir `setPendingSaleId(saleId)` em vez de usar `setTimeout`

4. Remover o `setTimeout` actual

O `useEffect` ira reagir automaticamente quando o React Query terminar o refetch e atualizar `sales`, garantindo que o modal de detalhes abre sempre.

| Ficheiro | Alteracao |
|---|---|
| `src/pages/Sales.tsx` | Substituir `setTimeout` por `useEffect` reativo com `pendingSaleId` |

