

## Corrigir modal de venda que nao abre ao aceitar proposta

### Problema

Quando o utilizador muda o status de uma proposta para "Aceite", o `CreateSaleModal` (um Dialog) abre por cima do `ProposalDetailsModal` (outro Dialog). O Radix UI interpreta isto como uma interacao fora do primeiro Dialog e dispara `onOpenChange(false)` no modal pai. Na pagina de Propostas, isso faz `setSelectedProposal(null)`, o que desmonta tudo -- incluindo o modal de venda que acabou de abrir.

### Solucao

Modificar o `onOpenChange` do Dialog pai no `ProposalDetailsModal` para nao fechar enquanto o modal de venda (`showSaleModal`) estiver aberto. Isto impede que o Radix feche o modal pai quando o modal de venda aparece.

### Detalhes tecnicos

**Ficheiro: `src/components/proposals/ProposalDetailsModal.tsx`**

Alterar a linha 487 de:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
```
Para:
```tsx
<Dialog open={open} onOpenChange={(isOpen) => {
  if (!isOpen && showSaleModal) return;
  onOpenChange(isOpen);
}}>
```

Isto garante que:
- Se o utilizador fecha o modal manualmente (clicando no X ou fora), funciona normalmente
- Se o Radix tenta fechar o modal pai porque o `CreateSaleModal` abriu, o evento e ignorado
- Depois de criar a venda, o `handleSaleCreated` atualiza o status e o fluxo continua normalmente

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Proteger `onOpenChange` do Dialog pai contra fecho quando `showSaleModal` esta aberto |

