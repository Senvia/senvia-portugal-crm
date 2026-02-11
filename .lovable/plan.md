

## Reduzir largura dos modais de Propostas

### Problema
Os modais "Nova Proposta" e "Editar Proposta" estao com `sm:max-w-3xl` (768px), que e demasiado largo para o conteudo.

### Solucao
Alterar ambos para `sm:max-w-2xl` (672px) -- um meio-termo entre o antigo `lg` (512px) e o actual `3xl` (768px).

### Alteracoes

**`src/components/proposals/CreateProposalModal.tsx`**
- Alterar `sm:max-w-3xl` para `sm:max-w-2xl`

**`src/components/proposals/EditProposalModal.tsx`**
- Alterar `sm:max-w-3xl` para `sm:max-w-2xl`

### Ficheiros a editar
- `src/components/proposals/CreateProposalModal.tsx` (1 linha)
- `src/components/proposals/EditProposalModal.tsx` (1 linha)

