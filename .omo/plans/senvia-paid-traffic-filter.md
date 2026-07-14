# senvia-paid-traffic-filter - Work Plan

## TL;DR (For humans)

**What you'll get:** No Dashboard do CRM aparece um novo botão "Só tráfego pago". Quando ligado, todos os números do Dashboard (leads, conversão, ganhas, perdidas, valor gerado) passam a refletir exclusivamente leads vindos de Facebook Ads, Google Ads, TikTok Ads (e restantes canais pagos). O mesmo filtro passa a estar disponível no relatório de Leads. A preferência fica guardada no navegador — não tens de a ligar outra vez amanhã.

**Why this approach:** O CRM já tinha um cartão isolado de "Tráfego Pago", mas só olhava para 3 números. Centralizamos a regra num helper partilhado e expômo-la como um toggle global através de um Context (com persistência localStorage), em vez de irmos widget a widget replicar a string de filtro ou tentarmos uma migração de base de dados. Mantém-se coerente com as convenções do CLAUDE.md (usePersistedState, path alias `@/`, sem testes formais).

**What it will NOT do:**
- Não cria coluna nova na base de dados para marcar "pago" — não há migração SQL.
- Não mexe em `/marketing/relatorios` (a página de email marketing) — essa continua a mostrar todos os envios.
- Não modifica a forma como os leads são captados — só a forma como são *mostrados*.

**Effort:** Short
**Risk:** Low — additive UI change, sem migração, sem dependências novas.

**Decisions to sanity-check:**
- Lista de "pagos" = mesma string do `PaidTrafficCard.tsx` atual (`%ads%`, `%pago%`, `%paid%`) + as labels canónicas detetadas por `detectLeadSource` (`Facebook Ads`, `Google Ads`, `TikTok Ads`). Se quiseres incluir/excluir LinkedIn Ads, Instagram Ads, YouTube Ads — uma linha no helper resolve.
- Toggle persiste **por dispositivo** (localStorage) e não sincroniza entre membros da equipa — é uma preferência pessoal de visualização.

Your next move: arrancar a implementação (clicar em `$start-work` na barra ou responder "vai"). Detalhe abaixo.

---

> TL;DR (machine): Short additive UI change; toggle global no Dashboard + LeadsReportPanel; localStorage; sem migração; 12 ficheiros tocados.

## Scope

### Must have
- Função pura `isPaidTraffic(source: string | null): boolean` em `src/lib/paid-traffic.ts` que retorna `true` para:
  - Qualquer `source` que case (case-insensitive) com `ilike %ads%`, `%pago%`, `%paid%`.
  - Labels literais exatas: `"Facebook Ads"`, `"Google Ads"`, `"TikTok Ads"`, `"Instagram Ads"`, `"LinkedIn Ads"`, `"YouTube Ads"`, `"Twitter/X Ads"`.
  - Labels de UTM mapeadas em `source-detection.ts` quando o `utm_medium` (ou `utm_source` + click id) indica campanha paga. Para já ficamos pelos labels canónicos — não precisamos de tocar em `source-detection.ts`.
- `PaidTrafficFilterContext` em `src/contexts/PaidTrafficFilterContext.tsx`:
  - Provider `PaidTrafficFilterProvider`.
  - Hook `usePaidTrafficFilter(): { paidOnly: boolean; toggle: () => void; setPaidOnly: (v: boolean) => void }`.
  - Persistência via `usePersistedState("dashboard-paid-traffic-only-v1", false)` (padrão `CLAUDE.md §Filter persistence`).
- Toggle acessível no `src/pages/Dashboard.tsx`, dentro do `actions={...}` do `PageHeader`, **antes** do `<TeamMemberFilter />`:
  - Componente shadcn/ui `Button variant="outline"` com ícone `MousePointerClick` da `lucide-react`.
  - Estado visual: `outline` quando desligado, `default` (preenchido) quando ligado. Tooltip "Mostrar apenas leads vindas de tráfego pago".
  - Text "Só tráfego pago".
- Wrap do provider no `src/main.tsx` (ou `src/App.tsx` — confirmar durante execução, priorizando `main.tsx`).
- `PaidTrafficCard.tsx` passa a consumir `usePaidTrafficFilter()` e filtra os `leads` por `isPaidTraffic(source)` no momento da query (mantém o `PAID_FILTER` existente como fallback se `source` for null/vazio, e adiciona filtro adicional em memória pelos labels canónicos).
- Restantes widgets do Dashboard que dependem de leads — `TeamPerformanceTable`, `MetricsPanel`, `SalesPerformancePanel`, `CommitmentPanel`, `ActivationsPanel` — aplicados:
  - Cada um consome `useLeads()` indiretamente (via hook próprio).
  - O approach mais limpo: filtrar no momento da leitura (ex.: criar `useFilteredLeads()` em `src/hooks/useFilteredLeads.ts` que aplica `useLeads()` + `isPaidTraffic` + `usePaidTrafficFilter`).
- `useLeadReporting(period, paidOnly?)` em `src/hooks/useLeadReporting.ts` aceita novo parâmetro `paidOnly: boolean` (default `false`). Aplica filtro `isPaidTraffic(l.source)` em `filteredLeads` antes de calcular totais/bySource/commercials.
- `LeadsReportPanel` aceita `paidOnly` via prop ou consome o contexto diretamente. Decidir durante implementação: **consumir o contexto** para o filtro estar sincronizado com o Dashboard.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- **Sem migrations Supabase / SQL** — não criar coluna `is_paid` ou `traffic_type`.
- **Sem novas dependências em `package.json`** — usa shadcn/ui + lucide-react já presentes.
- **Sem mexer em `/marketing/relatorios`**, `/campaigns`, ou outros relatórios fora do Dashboard + Leads.
- **Sem alterar `source-detection.ts`** — só consumimos o que ele já produz.
- **Sem traduções i18n novas** — pt-PT como o resto da UI.
- **Sem testes Vitest/jest novos** — projeto não tem suite de testes (`CLAUDE.md §No tests exist`).
- **Sem novo Estado global Zustand** — Context é suficiente para 1 booleano.
- **Não bloquear a UI em loading** quando o filtro muda — manter reatividade do React Query.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: **none** (projeto sem suite de testes formais — confirmado em CLAUDE.md §9). Verificação por:
  1. `npx tsc --noEmit --skipLibCheck` deve sair com `exit 0` (regra do CLAUDE.md §2).
  2. `npm run lint` deve sair 0.
  3. Vite dev server (já na 8081) responde 200 e HMR sem erro nos logs.
  4. `curl http://127.0.0.1:8081/` retorna HTML.
- Evidence: `.omo/evidence/task-1-senvia-paid-traffic-filter.tsc.log`, `task-2-...`, `task-N-...`.

## Execution strategy

### Parallel execution waves

> As 5 vagas abaixo cobrem as 9 tarefas. Cada tarefa = "implementação + verificação (tsc/lint/curl)". O worker deve rodar dentro do `git worktree` criado por `using-git-worktrees` (skill) ou então no ramo de feature `feat/paid-traffic-filter`.

**Wave 1 — Foundation (1 tarefa, sem paralelismo com Wave 2)**
- T1: helper `isPaidTraffic` + constants.

**Wave 2 — Estado partilhado (1 tarefa)**
- T2: `PaidTrafficFilterContext` + provider + `useFilteredLeads` hook.

**Wave 3 — Integração no Dashboard (4 tarefas, em paralelo dentro da vaga, mas cada uma opera num ficheiro distinto → podem ser waves separadas de um sub-agent)**
- T3: Toggle no PageHeader de `Dashboard.tsx` + wrap do provider em `main.tsx`.
- T4: `PaidTrafficCard` consome o contexto.
- T5: `useLeadReporting` aceita `paidOnly` + `LeadsReportPanel` consome o contexto.
- T6: Restantes widgets (`TeamPerformanceTable`, `MetricsPanel`, `SalesPerformancePanel`, `CommitmentPanel`, `ActivationsPanel`) consomem `useFilteredLeads`.

**Wave 4 — Hardening & Evidence (3 tarefas)**
- T7: `npx tsc --noEmit --skipLibCheck`.
- T8: `npm run lint`.
- T9: Tail logs de Vite na 8081 + curl GET `/` → 200.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 helper | — | T2 | — |
| T2 contexto | T1 | T3, T4, T5, T6 | — |
| T3 toggle + provider | T2 | T4, T5, T6 (via wrap main.tsx) | — |
| T4 PaidTrafficCard | T2, T3 | F1/F2/F3 | T5, T6 |
| T5 LeadsReportPanel | T2, T3 | F1/F2/F3 | T4, T6 |
| T6 outros widgets | T2, T3 | F1/F2/F3 | T4, T5 |
| T7 tsc | T1–T6 | F1 | — |
| T8 lint | T1–T6 | F1 | — (sequencial após tsc) |
| T9 vite logs + curl | T3 (rodar server já está) | F3 | T7 |

## Todos

> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

- [x] 1. Create `src/lib/paid-traffic.ts` with the single-source-of-truth helper.
  What to do / Must NOT do: Implementar `isPaidTraffic(source: string | null): boolean` e `PAID_SOURCE_LABELS: readonly string[]`. Não tocar em `source-detection.ts`. Não criar constantes duplicadas no resto do projeto.
  Parallelization: Wave 1 | Blocked by: — | Blocks: T2
  References (executor has NO interview context - be exhaustive):
    - src/components/dashboard/PaidTrafficCard.tsx:14-21 (lista de strings preexistente)
    - src/lib/source-detection.ts:7-22, :167-187 (labels que detectLeadSource pode emitir para tráfego pago)
  Acceptance criteria (agent-executable): `node -e "const { isPaidTraffic } = require('./src/lib/paid-traffic.ts')"` deve falhar por TS, então exportar apenas se for usado pelo lint — alternativa: `npx tsc --noEmit --skipLibCheck` exit 0 e o ficheiro aparecer em `tsconfig.app.json`'s include.
  QA scenarios:
    - happy: `isPaidTraffic("Facebook Ads") === true`, `isPaidTraffic("Pago / Google Ads") === true`, `isPaidTraffic("Direto") === false`, `isPaidTraffic(null) === false`.
    - failure: chamar com `undefined` não lança; chamar com string vazia devolve `false`.
  Evidence: .omo/evidence/task-1-senvia-paid-traffic-filter.tsc.log
  Commit: Y | feat(paid-traffic): add isPaidTraffic helper

- [x] 2. Create `PaidTrafficFilterContext` + `useFilteredLeads` hook.
  What to do / Must NOT do: Criar `src/contexts/PaidTrafficFilterContext.tsx` com `PaidTrafficFilterProvider`, `usePaidTrafficFilter()`. Persistir via `usePersistedState("dashboard-paid-traffic-only-v1", false)`. Criar `src/hooks/useFilteredLeads.ts` que combine `useLeads()` + `usePaidTrafficFilter()` e devolva lista filtrada (paga ou completa, conforme o toggle). Não criar store Zustand novo.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: T3, T4, T5, T6
  References:
    - src/contexts/AuthContext.tsx (padrão de Context já existente)
    - src/hooks/useDashboardWidgets.ts (padrão de hook que combina estado)
    - src/hooks/usePersistedState.ts (provavelmente exporta este nome; se não existir, procurar em src/hooks/)
    - CLAUDE.md §Filter persistence
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; o provider exporta `PaidTrafficFilterProvider` e `usePaidTrafficFilter` nomeados; `useFilteredLeads()` devolve `Lead[]`.
  QA scenarios:
    - happy: com `paidOnly=true`, devolve apenas leads com `isPaidTruthy(source)`.
    - failure: com `paidOnly=false`, devolve a lista completa original (mesma referência se possível).
    - edge: `usePaidTrafficFilter()` fora do provider lança `Error` descritivo.
  Evidence: .omo/evidence/task-2-senvia-paid-traffic-filter.tsc.log
  Commit: Y | feat(paid-traffic): add PaidTrafficFilterContext + useFilteredLeads

- [x] 3. Wrap provider in `main.tsx` and add toggle to `Dashboard.tsx` PageHeader.
  What to do / Must NOT do: Importar `PaidTrafficFilterProvider` em `src/main.tsx` (ou `src/App.tsx` se for o entry) e envolver a árvore por **fora** do `QueryClientProvider` (ou por dentro, pode ser — seguir convenção). Adicionar `<Button variant={paidOnly ? "default" : "outline"} onClick={toggle}>` antes do `<TeamMemberFilter />` no `actions` do `Dashboard.tsx`. Texto "Só tráfego pago", ícone `MousePointerClick`.
  Parallelization: Wave 3 | Blocked by: T2 | Blocks: T4, T5, T6, T9
  References:
    - src/pages/Dashboard.tsx:48-67 (estrutura do PageHeader e actions)
    - src/main.tsx (entry point)
    - src/components/ui/button.tsx (API do Button)
    - lucide-react: já tem `MousePointerClick` exportado
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; o toggle renderiza no DOM e ao clicar altera `paidOnly` (verificar no `useFilteredLeads` mock).
  QA scenarios:
    - happy: toggle liga, e o hook `usePaidTrafficFilter()` retorna `paidOnly=true` (verificável em DevTools / console.log temporário se preciso).
    - failure: toggle não quebra layout do header em mobile (sm/md) — verificar classes utilitárias.
  Evidence: .omo/evidence/task-3-senvia-paid-traffic-filter.tsc.log
  Commit: Y | feat(dashboard): add paid-traffic toggle + provider wrap

- [x] 4. Wire `PaidTrafficCard` to the filter context.
  What to do / Must NOT do: Substituir a constante `PAID_FILTER` por uma composição: PostgREST `or(ilike %ads%, …)` continua a ser enviado para o backend (mais performante). Adicionalmente, aplicar `isPaidTraffic(l.source)` em memória como segunda camada, **condicional ao toggle do contexto** (só filtra se `paidOnly=true`). Se o toggle estiver desligado, mostra o estado atual sem dupla filtragem.
  Parallelization: Wave 3 | Blocked by: T2, T3 | Blocks: F1/F2/F3
  References:
    - src/components/dashboard/PaidTrafficCard.tsx:14-21, :44-85 (query + estrutura do card)
    - src/lib/paid-traffic.ts (helper a importar)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; visualmente, ligar o toggle altera os 3 números do card para apenas fontes pagas (em ambiente de produção: verificar pela DB orgânica de leads de teste).
  QA scenarios:
    - happy: `paidOnly=true` mostra números menores (ou zero) coerentes com apenas canais pagos.
    - failure: `paidOnly=false` mantém o comportamento atual.
  Evidence: .omo/evidence/task-4-senvia-paid-traffic-filter.curl.log
  Commit: Y | refactor(dashboard): PaidTrafficCard obeys paidOnly toggle

- [x] 5. Extend `useLeadReporting` + `LeadsReportPanel` to consume the filter.
  What to do / Must NOT do: Adicionar parâmetro opcional `paidOnly?: boolean` a `useLeadReporting(period, paidOnly = false)`. Aplicar `isPaidTraffic(l.source)` em `filteredLeads` antes dos totais. `LeadsReportPanel` consome `usePaidTrafficFilter()` (não recebe prop) — assim fica sincronizado com o Dashboard.
  Parallelization: Wave 3 | Blocked by: T2, T3 | Blocks: F1/F2/F3
  References:
    - src/hooks/useLeadReporting.ts:27-96 (a lógica inteira de filtragem e cálculo)
    - src/components/leads/LeadsReportPanel.tsx:16-19 (uso atual)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; quando o toggle do Dashboard está ligado, a aba "Relatórios" em `/leads` reflete os mesmos totais.
  QA scenarios:
    - happy: `paidOnly=true` → "Por Origem" mostra apenas Facebook Ads, Google Ads, TikTok Ads (e congêneres pagos).
    - failure: `paidOnly=false` mantém todas as origens visíveis.
    - edge: `useLeadReporting('all', true)` com zero leads pagas → cards a zero, tabela com mensagem vazia.
  Evidence: .omo/evidence/task-5-senvia-paid-traffic-filter.tsc.log
  Commit: Y | feat(leads-report): respect paid-only filter

- [x] 6. Apply `useFilteredLeads` to remaining dashboard widgets.
  What to do / Must NOT do: Trocar `useLeads()` por `useFilteredLeads()` em:
    - `TeamPerformanceTable`
    - `MetricsPanel`
    - `SalesPerformancePanel`
    - `CommitmentPanel`
    - `ActivationsPanel`
  Cada widget mantém a sua lógica interna; só a fonte de dados muda. Se algum widget precisar de `source` específico no payload, tratar lá dentro (ex.: se `bySource` exibe "Direto", com filtro ligado continua a mostrar 0).
  Parallelization: Wave 3 | Blocked by: T2, T3 | Blocks: F1/F2/F3
  References:
    - src/components/dashboard/TeamPerformanceTable.tsx
    - src/components/dashboard/MetricsPanel.tsx
    - src/components/dashboard/SalesPerformancePanel.tsx
    - src/components/dashboard/CommitmentPanel.tsx
    - src/components/dashboard/ActivationsPanel.tsx
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; abrir o Dashboard com `paidOnly=true` e os números dos widgets refletem só o tráfego pago.
  QA scenarios:
    - happy: ligar toggle → todos os cards se recalculam; desligar → volta ao normal.
    - failure: `useFilteredLeads` chamado fora do provider (não vai acontecer porque estão dentro do Dashboard) — não testar isto; se acontecer, lançar.
  Evidence: .omo/evidence/task-6-senvia-paid-traffic-filter.tsc.log
  Commit: Y | refactor(dashboard): widgets honor paid-traffic filter

- [x] 7. Run `npx tsc --noEmit --skipLibCheck` and verify exit 0.
  What to do / Must NOT do: Regra do CLAUDE.md §2. Não fazer `tsc --build` (pode ser mais lento e menos permissivo).
  Parallelization: Wave 4 | Blocked by: T1–T6 | Blocks: F1
  References:
    - CLAUDE.md §2 ("Always verify TypeScript before pushing")
  Acceptance criteria: exit 0; stderr vazio; stdout apenas com nota informativa sobre ficheiros incluídos.
  QA scenarios:
    - happy: exit 0.
    - failure: qualquer erro TS — bloquear push, reportar a tarefa que introduziu o erro.
  Evidence: .omo/evidence/task-7-senvia-paid-traffic-filter.tsc.log
  Commit: N (lint/tsc não comitam sozinhos)

- [x] 8. Run `npm run lint` and verify exit 0.
  What to do / Must NOT do: Lint pode estar desatualizado — só fixar warnings introduzidos por este PR. Não tocar em ficheiros não relacionados.
  Parallelization: Wave 4 | Blocked by: T1–T6, T7 | Blocks: F1
  References:
    - package.json:7-12 (script `lint`)
    - eslint.config.js
  Acceptance criteria: exit 0 ou 0 erros.
  QA scenarios:
    - happy: exit 0.
    - failure: reportar warnings novos; não corrigir warnings preexistentes.
  Evidence: .omo/evidence/task-8-senvia-paid-traffic-filter.lint.log
  Commit: N

- [x] 9. Tail Vite dev log on :8081 + curl GET `/`.
  What to do / Must NOT do: Confirmar que o dev server (PID 4272) continua sem `[ERROR]`/throw novo. `curl http://127.0.0.1:8081/` devolve 200.
  Parallelization: Wave 4 | Blocked by: T3 | Blocks: F3
  References:
    - C:\Users\THIAGO~1\AppData\Local\Temp\opencode\senvia-crm-vite-8081.out.log
    - C:\Users\THIAGO~1\AppData\Local\Temp\opencode\senvia-crm-vite-8081.err.log
  Acceptance criteria: `curl 127.0.0.1:8081/` → HTTP 200, body length > 0. Logs sem `ERROR`, sem `Unhandled`, sem `Failed`.
  QA scenarios:
    - happy: 200 + logs limpos.
    - failure: se Vite falhou (HMR error), investigar e corrigir.
  Evidence: .omo/evidence/task-9-senvia-paid-traffic-filter.curl.log
  Commit: N

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — comparar `git diff --stat` com lista de ficheiros esperados (todos os do dependency matrix); verificar que nenhum Must NOT have foi violado.
- [x] F2. Code quality review — `npx tsc --noEmit --skipLibCheck` exit 0; `npm run lint` exit 0; nenhuma dep nova em `package.json`; nenhuma migration nova.
- [x] F3. Real manual QA — abrir `http://localhost:8081/`, navegar ao Dashboard, alternar o toggle, observar cards. Confirmar mudança de números. Confirmar `/leads → Relatórios` reflete o mesmo filtro. Abrir DevTools → Application → Local Storage → confirmar chave `dashboard-paid-traffic-only-v1`.
- [x] F4. Scope fidelity — nenhum ficheiro de `/marketing/relatorios`, `source-detection.ts` ou migrations tocado.

## Commit strategy
- 6 commits granulares (um por T1–T6, formato `feat(scope):` ou `refactor(scope):` em inglês conforme o padrão atual do projeto — confirmar estilo nos últimos commits).
- T7–T9 não comitam sozinhos.
- Mensagens em português (convenção `CLAUDE.md §Commit convention`).
- Co-author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.
- Branch: `feat/paid-traffic-filter` (criado pelo worker via `using-git-worktrees`).
- Merge para `main` APENAS após F1–F4 aprovarem e o utilizador der OK.
- `git push origin main` faz deploy automático em Vercel (`CLAUDE.md §3`).

## Success criteria
- Toggle "Só tráfego pago" visível e funcional no header do Dashboard.
- Quando ligado, **todos** os números mostrados no Dashboard (incluindo `PaidTrafficCard`, `TeamPerformanceTable`, `MetricsPanel`, `SalesPerformancePanel`, `CommitmentPanel`, `ActivationsPanel`) refletem apenas leads com `isPaidTraffic(source) === true`.
- A aba "Relatórios" em `/leads` aplica o mesmo filtro automaticamente.
- A preferência persiste entre recarregamentos da página (localStorage chave `dashboard-paid-traffic-only-v1`).
- `npx tsc --noEmit --skipLibCheck` exit 0.
- `npm run lint` exit 0.
- Vite dev server em :8081 sem novos erros.
- Sem migrations, sem novas deps, sem alterações a `source-detection.ts` ou `/marketing/relatorios`.
- 1 commit por tarefa, mensagens em português, branch `feat/paid-traffic-filter`.
