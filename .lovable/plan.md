

## Adicionar secção "Objetivo" ao card Objetivo Mensal

O card "Objetivo Mensal" tem atualmente apenas 2 secções (Vendas + Concretização). Falta a secção **A) Objetivo** que mostra os targets definidos pelo admin para cada colaborador (como na imagem de referência — Consultor | NIF | Energia | Solar | Comissão).

### Estrutura final do card:

```text
┌────────────────────────────────────────┐
│ 📊 Objetivo Mensal — março 2026  [✏️]  │
│                                        │
│ ── A) Objetivo ─────────────────────── │
│ Colaborador | NIF | Energia | Solar | € │
│ André       |  6  |  500    |  30   |400│
│                                        │
│ ── B) Vendas ───────────────────────── │
│ André       |  3  |  300    |  15   |200│
│                                        │
│ ── C) Concretização do Objetivo ────── │
│ André       | 50% |  60%   |  50%  |50%│
└────────────────────────────────────────┘
```

### Alterações

**`SalesPerformancePanel.tsx`** — adicionar uma nova secção collapsible **A) Objetivo** antes de Vendas:
- Tabela com `objectiveRows` (dados da tabela `monthly_objectives`)
- Colunas: Colaborador, NIFs, Energia, Solar, Comissão (valores absolutos, não percentuais)
- Renumerar: A) Objetivo, B) Vendas, C) Concretização
- Adicionar state `objOpen` para o collapsible
- Linha TOTAL se admin com múltiplos colaboradores

Apenas 1 ficheiro alterado.

