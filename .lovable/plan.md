

## Impedir reutilização de propostas em vendas

### Problema
Ao criar uma nova venda, propostas que já foram convertidas em venda continuam a aparecer na lista de seleção, permitindo criar vendas duplicadas com a mesma proposta.

### Alteração

**`src/components/sales/CreateSaleModal.tsx`** — no `filteredProposals` (linhas 357-375):

Adicionar filtro para excluir propostas que já têm vendas associadas. O hook `useProposals` já faz fetch de `linked_sales:sales!sales_proposal_id_fkey(id)`, portanto basta verificar se `linked_sales` está vazio.

Lógica:
```typescript
// Excluir propostas que já têm venda (exceto a do prefill)
filtered = filtered.filter(p => 
  p.id === prefillProposal?.id || 
  !p.linked_sales || 
  p.linked_sales.length === 0
);
```

Resultado: Propostas já convertidas em venda deixam de aparecer no dropdown de seleção ao criar nova venda. Apenas propostas "aceites" e sem venda associada ficam disponíveis.

