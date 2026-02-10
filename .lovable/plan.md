

## Adicionar cores aos selects de status (Propostas e Vendas)

### Objetivo

Quando o utilizador seleciona um status na proposta ou na venda, o `SelectTrigger` e cada `SelectItem` devem mostrar a cor correspondente ao status (usando as constantes `PROPOSAL_STATUS_COLORS` e `SALE_STATUS_COLORS` ja existentes).

### Alteracoes

**Ficheiro 1: `src/components/proposals/ProposalDetailsModal.tsx`**

- No `SelectTrigger` (~linha 611): adicionar a classe de cor do status atual
  ```tsx
  <SelectTrigger className={cn(PROPOSAL_STATUS_COLORS[status])}>
  ```
- Em cada `SelectItem` (~linha 615): adicionar badge com cor dentro do item
  ```tsx
  <SelectItem key={s} value={s}>
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', PROPOSAL_STATUS_COLORS[s])}>
      {PROPOSAL_STATUS_LABELS[s]}
    </span>
  </SelectItem>
  ```

**Ficheiro 2: `src/components/sales/SaleDetailsModal.tsx`**

- No `SelectTrigger` (~linha 163): adicionar a classe de cor do status atual
  ```tsx
  <SelectTrigger className={cn(SALE_STATUS_COLORS[status])}>
  ```
- Em cada `SelectItem` (~linha 168): adicionar badge com cor dentro do item
  ```tsx
  <SelectItem key={s} value={s}>
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', SALE_STATUS_COLORS[s])}>
      {SALE_STATUS_LABELS[s]}
    </span>
  </SelectItem>
  ```

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Cor no SelectTrigger e SelectItems do status |
| `src/components/sales/SaleDetailsModal.tsx` | Cor no SelectTrigger e SelectItems do status |
