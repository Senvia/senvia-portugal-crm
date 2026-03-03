

## Adicionar indicação de tipo (EE / Serviços) no dropdown de seleção de proposta

### Alteração

**`src/components/sales/CreateSaleModal.tsx`** — linha 702:

No label do `SearchableCombobox` das propostas filtradas, adicionar um prefixo com o tipo da proposta:

**De:**
```
`${proposal.client?.name || ...} - ${formatCurrency(proposal.total_value)} (${getProposalStatusLabel(proposal.status)})`
```

**Para:**
```
`[${proposal.proposal_type === 'servicos' ? 'Serviços' : 'EE'}] ${proposal.client?.name || ...} - ${formatCurrency(proposal.total_value)} (${getProposalStatusLabel(proposal.status)})`
```

Resultado: Cada proposta no dropdown aparece com `[EE]` ou `[Serviços]` antes do nome do cliente, facilitando a identificação imediata do tipo.

