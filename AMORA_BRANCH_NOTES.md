# Branch `Amora` — Plano de Ativação (implementação)

Implementação completa do plano de ativação proposto pela Amora, adaptado ao que já existia no Otto 2.0 e na infra de trials. Tudo nesta branch, por rever. **Nada foi corrido contra produção.**

## O que foi feito (por sprint)

### Sprint 0 — Sinal de atividade
- `supabase/migrations/20260622120000_org_activity_signal.sql`: adiciona a `organizations` as colunas `last_active_at`, `first_lead_at`, `first_client_at`, `first_sale_at`, `first_proposal_at`, `first_inbox_reply_at`; cria a função `stamp_org_activity()` + triggers AFTER INSERT em `leads`, `crm_clients`, `sales`, `proposals`; faz backfill dos dados existentes.
- Medição de conversão (`first_paid_at`): **já estava correta** (migração `20260617120000` limpou o backfill corrompido; o webhook do Stripe só a escreve no pagamento real). Não foi preciso mexer.

### Sprint 1 — Otto: caminho de valor até ao "aha"
- `otto/lib/tools/write.ts`: novas tools `create_sale` e `create_proposal` (permission-gated + auditadas, validam org/lead antes de criar).
- `otto/lib/onboarding.ts` + `types.ts`: funil reordenado para o caminho de valor primeiro (empresa → pipeline → importar leads → **primeiro cliente → primeira venda → primeira proposta**) e config pesada (faturação, integrações, equipa) no fim. Novos checks `clients`/`sales`/`proposals` derivados de dados reais.
- `otto/lib/prompts.ts` + `onboarding-tools.ts`: prompt de ativação (foco em ver dinheiro na 1ª venda, dados reais > exemplos), `get_onboarding_status` atualizado.

### Sprint 2 — Sequência de emails de trial
- `supabase/migrations/20260622121000_trial_email_sequence_seed.sql`: **seed idempotente** dos templates dos 6 triggers que o `check-trial-status` já dispara (`trial_started`, `trial_day_3`, `trial_day_7`, `trial_expiring_3d`, `trial_expiring_1d`, `trial_expired`) + o novo `trial_inactive_48h`. Só insere se faltar (não toca em copy existente). Copy focado em ativação.

### Sprint 3 — Dashboard de ativação
- `supabase/migrations/20260622122000_trial_activation_overview.sql`: view `trial_activation_overview` (`security_invoker`, RLS do chamador aplica-se). Funil por org: nível none/minimum/medium/advanced, dias restantes, horas desde a última atividade, estado (active/expired/paying).
- `src/pages/system-admin/TrialActivation.tsx` + rota `/system-admin/activation` + botão no Painel Super Admin. Cards (trials ativos, chegaram ao aha, parados +48h, conversão), funil e tabela.

### Sprint 4 — Inatividade + métricas
- `supabase/functions/trial-inactivity-check/index.ts`: cron que deteta trials sem atividade há 48h (`now - COALESCE(last_active_at, created_at)`), envia email de re-engajamento (`trial_inactive_48h`) ao responsável e alerta a equipa SENVIA. Idempotente via `trial_reminders_sent['inactivity_48h']`. Registado em `config.toml` (`verify_jwt = false`).
- Métricas de ativação (P5): cobertas pelos cards + funil do dashboard.

### Onboarding por módulo (unificado, Fase 1)
Implementação do `unificacao-onboarding.md` (aprovado). Um modelo único, sem tabela nova.
- `supabase/migrations/20260622123000_onboarding_module_dismissed.sql`: coluna `module_dismissed jsonb` na `org_onboarding_state` já existente + política INSERT para membros (o frontend precisa de criar a linha ao dispensar).
- `src/hooks/useActivationProgress.ts`: badge derivado de **sinais reais** (os 8 módulos: leads/clientes/vendas/propostas via `first_*_at`, faturação via `billing_provider`, integrações via `brevo`/`integrations_enabled`, inbox via `messaging_channels`/`whatsapp_instance`, equipa via contagem de membros). `useModuleOnboarding` decide o peek + dispensar.
- `src/components/otto/ModuleOnboardingPeek.tsx`: bolha suave (não-modal) montada uma vez no [AppLayout.tsx](src/components/layout/AppLayout.tsx); aparece nos 4 módulos de valor (Leads, Clientes, Vendas, Propostas), abre o Otto com mensagem semente ao aceitar, persiste o dispensar. **Sem dados de exemplo** (cria sempre dados reais). WhatsApp continua via QR.
- Badge `(X/8)` na sidebar ([AppSidebar.tsx](src/components/layout/AppSidebar.tsx)) no item Definições, só admin, só enquanto incompleto.
- Sistema atual (`onboarding.ts`, `tours.ts`, FAB) mantém-se como fallback.

## Deploy (manual, quando aprovares) — por ordem
1. **SQL** (Supabase SQL Editor, projeto `chhmfwlimtbsyjmgtokn`), por ordem de timestamp:
   - `20260622120000_org_activity_signal.sql`
   - `20260622121000_trial_email_sequence_seed.sql`
   - `20260622122000_trial_activation_overview.sql`
   - `20260622123000_onboarding_module_dismissed.sql`
2. **Edge functions:**
   - `supabase functions deploy otto --project-ref chhmfwlimtbsyjmgtokn` (novas tools)
   - `supabase functions deploy trial-inactivity-check --project-ref chhmfwlimtbsyjmgtokn`
3. **Cron** para a nova função (pg_cron, ex.: de hora a hora):
   - `select cron.schedule('trial-inactivity-check', '0 * * * *', $$ ... invoke trial-inactivity-check ... $$);`
   - (segue o mesmo padrão de invocação do `check-trial-status`/`notify-new-trials`)
4. **Frontend:** merge da branch → `git push` (Vercel auto-deploy). A página nova é só super-admin.
5. **Verificar:** que o cron `check-trial-status` está agendado e que os templates ficaram `automation_enabled = true` (o seed garante para os que faltavam).

## Notas / decisões
- A view é `security_invoker` para não escalar privilégios: super-admin vê tudo, utilizador normal só a própria org.
- O `trial-inactivity-check` dá UM toque por trial (não chateia em loop). Reativável se quiseres recorrência.
- Pendente e **independente** disto: o deploy de segurança (edge functions + SQL + branch `security-c5-org-secrets`) continua por fazer.
