

## Separar em 2 Cards Distintos

O refactor anterior fundiu tudo num único card. O utilizador quer **2 cards separados** como antes:

### Card 1 — "Objetivo Mensal" (Compromisso)
- Os targets definidos pelo utilizador (NIFs, Energia, Solar, Comissão)
- Botão de editar/criar objetivo
- Secção simples, sem vendas nem concretização

### Card 2 — "Vendas & Concretização"
- **A) Vendas** — dados reais do mês (do `useMonthSalesMetrics`)
- **B) Concretização** — percentagem (Vendas / Objetivo) com cores condicionais
- Inclui coluna NIFs

### Alterações

**`CommitmentPanel.tsx`** → Extrair em 2 componentes:
1. `CommitmentPanel` — mantém apenas os objetivos (compromisso) com botão editar
2. `SalesPerformancePanel` — novo componente com secções Vendas + Concretização

**`Dashboard.tsx`** → Renderizar ambos os cards no grid `lg:grid-cols-2`:
```
<CommitmentPanel />
<SalesPerformancePanel />
```

Ambos respeitam o filtro `selectedMemberId` e o filtro de equipa.

