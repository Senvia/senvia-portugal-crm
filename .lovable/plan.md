

## Redesenhar Layout — Atividade Comercial em Stack Vertical

### Problema
Os 3 cards (Compromisso, Objetivo Mensal, Métricas Mensais) estão lado a lado em `grid-cols-3`, ficando apertados e pouco legíveis — especialmente o MetricsPanel com 7 colunas.

### Solução
Empilhar verticalmente: cada card ocupa **1 linha inteira** (full-width). Ordem de cima para baixo:

```text
┌─────────────────────────────────────────────────┐
│ 🎯 Compromisso — março 2026                     │
│ (tabela full-width com mais espaço)              │
├─────────────────────────────────────────────────┤
│ 📊 Objetivo Mensal — março 2026                  │
│ (tabela full-width)                              │
├─────────────────────────────────────────────────┤
│ 📈 Métricas Mensais — março 2026                 │
│ A) Métricas  |  B) Ritmo  |  C) Concretização   │
└─────────────────────────────────────────────────┘
```

### Alteração

**`src/pages/Dashboard.tsx`** — 1 ficheiro, 1 mudança:
- Trocar `grid grid-cols-1 lg:grid-cols-3 gap-4` por `space-y-4` (stack vertical)
- Cada card fica com largura total, muito mais legível nas tabelas

