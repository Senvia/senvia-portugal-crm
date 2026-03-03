

## Adicionar secção "Métricas" (targets) ao card Métricas Mensais

O card tem atualmente apenas 2 secções (A: Ritmo + B: Concretização). Falta a secção que mostra os **valores absolutos dos targets** definidos pelo admin — os dados da tabela `monthly_metrics`.

### Estrutura final (3 secções):

```text
┌──────────────────────────────────────────────────┐
│ 📈 Métricas Mensais — março 2026          [✏️]   │
│                                                  │
│ ── A) Métricas ────────────────────────────────  │
│ Consultor | OP | Energia | OP | Solar | OP | €   │
│ André     | 25 |  2500   |  5 |  150  | 30 | 5000│
│                                                  │
│ ── B) Ritmo ───────────────────────────────────  │
│ André     | 12 |  3317   |  1 |  365  | 13 | 4626│
│                                                  │
│ ── C) Concretização das Métricas ──────────────  │
│ André     | 48%|  133%   | 20%|  243% | 43%|  93%│
└──────────────────────────────────────────────────┘
```

### Alteração

**`MetricsPanel.tsx`** — 1 ficheiro:
- Adicionar nova secção collapsible **A) Métricas** antes de Ritmo
- Mostra os valores absolutos da tabela `monthly_metrics` (os targets que o admin define): OP Energia, Energia, OP Solar, Solar, OP Comissão, Comissão
- Renumerar: A) Métricas, B) Ritmo, C) Concretização
- Adicionar state `metricasOpen` para o novo collapsible
- Linha TOTAL para admin com múltiplos colaboradores
- Os dados já existem no hook `useMonthlyMetrics` — apenas precisam de ser renderizados numa tabela

