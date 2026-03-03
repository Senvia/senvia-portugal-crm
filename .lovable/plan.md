

## Adicionar indicação de tipo (EE / Serviços) na lista de propostas do lead

### Problema
Na `ProposalsList` (que aparece dentro dos detalhes de um lead/cliente), cada proposta mostra apenas o status, código e valor — sem indicação se é **Energia** ou **Serviços**.

### Solução

**`src/components/proposals/ProposalsList.tsx`** — Adicionar o badge de tipo na lista de propostas, igual ao que já existe na página principal de Propostas:

Dentro do bloco de badges de cada proposta (após o badge de status), adicionar:

```tsx
{proposal.proposal_type && (
  <Badge className={cn('text-xs', proposal.proposal_type === 'energia' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-violet-500/20 text-violet-400')}>
    {proposal.proposal_type === 'energia' ? <Zap className="h-3 w-3 mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
    {PROPOSAL_TYPE_LABELS[proposal.proposal_type]}
  </Badge>
)}
```

Também será necessário importar `Zap`, `Wrench` do lucide-react e `PROPOSAL_TYPE_LABELS` dos tipos.

