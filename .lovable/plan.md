

## Adicionar botão "+ Nova Proposta" no drawer do Cliente

### O que fazer

O `ClientDetailsDrawer` já tem suporte para `onNewProposal` mas o `Clients.tsx` não passa esse callback. Basta:

**Ficheiro: `src/pages/Clients.tsx`**

1. Importar `CreateProposalModal` e adicionar estados `showCreateProposal` e `proposalClientId`
2. Passar `onNewProposal` ao `ClientDetailsDrawer`:
   ```ts
   onNewProposal={(client) => {
     setProposalClientId(client.id);
     setShowCreateProposal(true);
   }}
   ```
3. Renderizar `<CreateProposalModal>` com `preselectedClientId={proposalClientId}`

### Ficheiros alterados
- `src/pages/Clients.tsx` — estado + callback + modal de criação de proposta

