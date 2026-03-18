

## Problema

Os dados estão inconsistentes: o gráfico **Global** usa valores hardcoded no `summary` (90, 74, 16...) que são completamente diferentes dos valores do `teamBreakdown`. O Global deveria ser simplesmente a **soma** de todos os membros da equipa — mesmos dados, vista agregada vs. vista individual.

## Solução

**Ficheiro:** `src/components/portal-total-link/portalMetricData.ts`

1. Cada métrica (`portalHomeMetrics`) passa a ter o seu próprio array de `teamBreakdown` (em vez de um único partilhado entre todas).
2. O `summary` de cada métrica deixa de ser hardcoded — passa a ser **calculado automaticamente** como a soma dos valores de todos os membros da equipa.
3. Assim: Global = soma do teamBreakdown. Equipa = detalhe por membro. Mesmos dados, vistas diferentes.

**Ficheiro:** `src/components/portal-total-link/PortalMetricCard.tsx`
- Ajustar para usar o `teamBreakdown` específico de cada métrica (já recebe por props, sem grande mudança).

**Ficheiro:** `src/pages/portal-total-link/Home.tsx`
- Passar o `teamBreakdown` correto de cada métrica em vez do global partilhado.

### Estrutura de dados resultante

Cada `PortalMetric` passa a conter:
- `title`, `color`
- `teamBreakdown: TeamMetric[]` — dados por membro
- `summary` — computado: `{ objetivo: sum(...objetivo), ativos: sum(...ativos), pendentes: sum(...pendentes) }`

O gráfico Global mostra 3 barras (Objetivo, Ativos, Pendentes) com os totais. O gráfico Equipa mostra as mesmas barras mas divididas por membro. Os valores são os mesmos.

