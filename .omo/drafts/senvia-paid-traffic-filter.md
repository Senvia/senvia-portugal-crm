---
slug: senvia-paid-traffic-filter
status: approved
intent: clear
review_required: false
pending-action: write .omo/plans/senvia-paid-traffic-filter.md
approach: Toggle global "Só tráfego pago" no Dashboard header, persistido em localStorage (usePersistedState), exposto via Context; cada widget e o LeadsReportPanel consome o contexto e filtra leads pelos critérios já previstos em PaidTrafficCard (ilike %ads%/%pago%/%paid%) + lista canónica de fontes pagas (Facebook Ads, Google Ads, TikTok Ads, Instagram Ads, LinkedIn Ads, YouTube Ads, Twitter/X Ads) consolidada em novo helper `src/lib/paid-traffic.ts`.
---

# Draft: senvia-paid-traffic-filter

## Components (topology ledger)
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| paid-traffic-helper | Função pura `isPaidTraffic(source)` exportada e reutilizável | active | src/lib/paid-traffic.ts |
| filter-context | Provider + hook que persiste o toggle em localStorage com chave versionada | active | src/contexts/PaidTrafficFilterContext.tsx |
| dashboard-toggle | Botão/Toggle acessível no PageHeader do Dashboard | active | src/pages/Dashboard.tsx |
| widget-fan-out | PaidTrafficCard, TeamPerformanceTable, MetricsPanel, SalesPerformancePanel, CommitmentPanel, ActivationsPanel aplicam o filtro | active | src/components/dashboard/* |
| leads-report-filter | LeadsReportPanel e useLeadReporting aceitam `paidOnly` e recalculam totais | active | src/components/leads/LeadsReportPanel.tsx + src/hooks/useLeadReporting.ts |
| regression-evidence | npx tsc + curl 200 + Vite log sem erro | active | .omo/evidence/task-* |

## Open assumptions (announced defaults)
| assumption | default | rationale | reversible? |
| --- | --- | --- | --- |
| Como distinguir "pago" | Lista de strings (case-insensitive) + ilike `%ads%/%pago%/%paid%` | Já é o critério em `PaidTrafficCard.tsx`, replica no helper | sim |
| Onde armazenar o toggle | localStorage chave `dashboard-paid-traffic-only-v1` via `usePersistedState` | Padrão declarado no CLAUDE.md (§filter persistence) | sim |
| Escopo do filtro | Aplica a Dashboard + Leads → aba Relatórios | Cliente pediu "no dashboard" + visão consistente nos relatórios de leads | sim (reduzir é trivial) |
| Persistir por user vs por org | Por user (browser) | Mais simples; toggle pessoal de visualização | sim |

## Findings (cited - path:lines)
- `src/lib/source-detection.ts:7-22` e `:113-202` — `detectLeadSource()` produz labels "Facebook", "Google", "TikTok" via UTM + "Facebook Ads"/"Google Ads"/"TikTok Ads" via click IDs fbclid/gclid/ttclid.
- `src/components/dashboard/PaidTrafficCard.tsx:14-21` — já existe `PAID_FILTER = ilike.%ads%, ilike.%pago%, ilike.%paid%, eq.Webhook Externo` usado num widget isolado.
- `src/pages/Dashboard.tsx:49-67` — `PageHeader` aceita `actions={<>...</>}` (Link + DashboardPeriodFilter + TeamMemberFilter). É o sítio natural para o novo toggle.
- `src/components/dashboard/{PaidTrafficCard,TeamPerformanceTable,MetricsPanel,SalesPerformancePanel,CommitmentPanel,ActivationsPanel}.tsx` — todos consomem `leads`/`source` indiretamente. Precisam filtrar.
- `src/hooks/useLeadReporting.ts:28-96` — calcula `totalLeads/totalWon/totalLost/globalConversion/bySource/commercials`. Recebe `useLeads()` e filtra por `created_at`. Não tem filtro de source.
- `src/components/leads/LeadsReportPanel.tsx:16-19` — usa `useLeadReporting(period)`.
- CLAUDE.md §Filter persistence + §Hooks pattern — convenção localStorage versionado e invalidação central.

## Decisions (with rationale)
- Helper único em `lib/paid-traffic.ts` em vez de duplicar a string `PAID_FILTER` em cada widget — princípio DRY.
- Context API em vez de prop drilling ou Zustand — toggle simples, 1 booleano, sem precisar de store global Zustand novo (o projeto já usa Zustand só para dashboard period e Otto chat; o resto usa Context/React Query).
- Persistência via `usePersistedState` — convenção do CLAUDE.md.
- NÃO criar coluna `is_paid` em `leads` (migration) — cliente pediu UI rápido; migração é mudança irreversível, fica fora deste escopo.

## Scope IN
- Toggle global "Só tráfego pago" no header do Dashboard, persistido
- Helper `isPaidTraffic(source)` partilhado
- Filter application em todos os widgets do Dashboard (PaidTrafficCard + restantes) e na LeadsReportPanel
- `useLeadReporting(period, paidOnly)` aceita novo parâmetro

## Scope OUT (Must NOT have)
- Sem migration SQL (sem `is_paid` na BD)
- Sem alterações em rotas de `/marketing/relatorios`
- Sem novo card — apenas re-aproveita widgets existentes com filtro
- Sem i18n nova — texto "Só tráfego pago" em pt-PT (consistente com a UI)

## Open questions
- Nenhuma bloqueante. Decisões restantes: posicionamento exato do toggle no header (à esquerda ou direita do TeamMemberFilter) — defaults decidido: à esquerda do TeamMemberFilter, mesma linha de actions.

## Approval gate
status: approved
<!-- User explicitly approved via Plan-mode question 1 = "Aprovado — arranca" and question 2 = "LocalStorage (Recomendado)" on 2026-07-10. -->
