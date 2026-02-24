
# Redirecionar para Vendas apos Criar Venda a partir de Proposta

## Problema

Quando uma venda e criada a partir de uma proposta (via modal "Aceite"), o utilizador permanece na pagina de Propostas com o modal aberto. O comportamento esperado e fechar tudo e redirecionar para a pagina de Vendas.

## Solucao

Alterar o `handleSaleCreated` no `ProposalDetailsModal.tsx` para:
1. Fechar o modal da venda (`setShowSaleModal(false)`)
2. Fechar o modal de detalhes da proposta (`onOpenChange(false)`)
3. Navegar para `/sales` usando `useNavigate`

## Secao Tecnica

### Ficheiro: `src/components/proposals/ProposalDetailsModal.tsx`

- Importar `useNavigate` de `react-router-dom`
- Inicializar `const navigate = useNavigate()` no componente
- Atualizar `handleSaleCreated`:

```typescript
const handleSaleCreated = () => {
  updateProposal.mutate({ id: proposal.id, status: 'accepted' });

  if (proposal.lead_id && finalPositiveStage) {
    updateLeadStatus.mutate({ leadId: proposal.lead_id, status: finalPositiveStage.key });
    updateLead.mutate({ leadId: proposal.lead_id, updates: { value: proposal.total_value } });
  }

  setShowSaleModal(false);
  onOpenChange(false);
  navigate('/sales');
};
```

Apenas 1 ficheiro sera alterado.
