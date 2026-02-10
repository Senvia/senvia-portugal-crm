

## Corrigir label de status da proposta no modal "Nova Venda"

### Problema

A funcao `getProposalStatusLabel` no `CreateSaleModal.tsx` (linha 310-317) nao trata o status `negotiating`. O switch so cobre `accepted`, `sent` e `pending`, e tudo o resto cai no `default: return 'Rascunho'`. Por isso, uma proposta "Em Negociacao" aparece como "Rascunho" no dropdown.

### Solucao

Substituir o switch incompleto pela importacao do mapa `PROPOSAL_STATUS_LABELS` que ja existe em `src/types/proposals.ts` e contem todos os status corretamente traduzidos.

### Alteracao

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

Substituir a funcao `getProposalStatusLabel` (linhas 309-317) por:

```typescript
const getProposalStatusLabel = (status: string) => {
  return PROPOSAL_STATUS_LABELS[status as ProposalStatus] || status;
};
```

E adicionar o import de `PROPOSAL_STATUS_LABELS` e `ProposalStatus` de `@/types/proposals` (se nao estiver ja importado).

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Usar `PROPOSAL_STATUS_LABELS` em vez do switch incompleto |

