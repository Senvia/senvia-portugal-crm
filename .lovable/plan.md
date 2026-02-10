

## Corrigir produtos/servicos que nao guardam preco editado na proposta

### Problema

Ha dois bugs no `EditProposalModal.tsx` para propostas nao-telecom:

1. **Produtos nunca sao carregados ao editar**: Na linha 105-106, existe um `TODO` e `setSelectedProducts([])` -- os produtos da proposta nunca sao lidos da base de dados quando o modal de edicao abre. Ou seja, ao editar, os produtos aparecem vazios e o utilizador tem de adicionar tudo outra vez.

2. **Produtos nunca sao guardados ao submeter**: O `handleSubmit` (linha 237) atualiza a proposta e os CPEs, mas **nunca chama** `useUpdateProposalProducts` para guardar os produtos editados (com precos alterados) na tabela `proposal_products`. O hook ja existe no codigo mas nao e importado nem usado.

Resultado: mesmo que o total fique correto (porque e calculado localmente), os produtos na base de dados mantem o preco original do catalogo.

### Solucao

1. Carregar os produtos existentes da proposta quando o modal abre (substituir o `TODO`)
2. Guardar os produtos editados ao submeter (chamar `useUpdateProposalProducts`)

### Detalhes tecnicos

**Ficheiro: `src/components/proposals/EditProposalModal.tsx`**

1. Importar `useProposalProducts` e `useUpdateProposalProducts` do hook `useProposals`

2. Adicionar query para carregar produtos existentes:
```tsx
const { data: existingProducts = [] } = useProposalProducts(proposal.id);
const updateProposalProducts = useUpdateProposalProducts();
```

3. No `useEffect` (linhas 102-107), substituir o `setSelectedProducts([])` por logica que carrega os produtos existentes:
```tsx
if (!isTelecom && existingProducts.length > 0) {
  setSelectedProducts(existingProducts.map(pp => ({
    product_id: pp.product_id,
    name: pp.product?.name || 'Produto',
    quantity: pp.quantity,
    unit_price: pp.unit_price,
    discount_type: 'percentage' as const,
    discount_value: 0,
  })));
  setManualValue('');
} else if (!isTelecom) {
  setManualValue(proposal.total_value?.toString() || '');
  setSelectedProducts([]);
}
```

4. No `handleSubmit` (apos linha 260), adicionar chamada para guardar produtos:
```tsx
if (!isTelecom && selectedProducts.length > 0) {
  await updateProposalProducts.mutateAsync({
    proposalId: proposal.id,
    products: selectedProducts.map(p => ({
      product_id: p.product_id,
      quantity: p.quantity,
      unit_price: p.unit_price,
      total: getProductTotal(p),
    })),
  });
}
```

5. Atualizar `isSubmitting` para incluir o novo mutation

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/EditProposalModal.tsx` | Importar e usar `useProposalProducts` + `useUpdateProposalProducts`; carregar produtos ao abrir; guardar ao submeter |

