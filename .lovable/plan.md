

# Corrigir "Propostas Recentes" e "Vendas Recentes" no ClientDetailsDrawer

## Problema
Os cards de Propostas e Vendas Recentes mostram dados em bruto:
- **ID truncado** (`#1e229838`) em vez do codigo legivel da proposta/venda
- **Status em ingles** (`accepted`) em vez de portugues (`Aceite`)

## Alteracoes em `src/components/clients/ClientDetailsDrawer.tsx`

### 1. Importar labels e cores de status
Adicionar imports de `PROPOSAL_STATUS_LABELS`, `PROPOSAL_STATUS_COLORS` de `@/types/proposals` e `SALE_STATUS_LABELS`, `SALE_STATUS_COLORS` de `@/types/sales`.

### 2. Propostas Recentes (linhas 438-448)
- Trocar `#{proposal.id.slice(0, 8)}` por `{proposal.code || `#${proposal.id.slice(0, 8)}`}` para mostrar o codigo quando disponivel
- Trocar `{proposal.status}` por `{PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}`
- Aplicar cores ao Badge: `className={cn('text-xs', PROPOSAL_STATUS_COLORS[proposal.status])}`

### 3. Vendas Recentes (linhas 461-470)
- Trocar `#{sale.id.slice(0, 8)}` por `{sale.code || `#${sale.id.slice(0, 8)}`}`
- Trocar `{sale.status}` por `{SALE_STATUS_LABELS[sale.status] || sale.status}`
- Aplicar cores ao Badge: `className={cn('text-xs', SALE_STATUS_COLORS[sale.status])}`

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`

