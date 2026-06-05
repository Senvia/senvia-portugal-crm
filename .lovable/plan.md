## Migração Supabase: `zppcobirzgpfcrnxznwe` → `chhmfwlimtbsyjmgtokn`

**Volume:** 591 MB DB · 51 users · 19 orgs · 3716 leads · 113 sales · 5 buckets de storage · ~46 edge functions.

**Modelo:** tu adicionas secrets aqui, eu corro tudo via edge function dedicada (`migration-runner`) + scripts. Downtime ~45-60 min agora.

---

### Fase 0 — Pré-requisitos (tu fazes manualmente, 5 min)

No **novo projeto Supabase** (`chhmfwlimtbsyjmgtokn`):
1. Database → Extensions: ativar `pg_net`, `pg_cron`, `unaccent`, `vault`, `pgcrypto`
2. Authentication → Providers: ativar Email + Google (mesmas credenciais OAuth)
3. Authentication → URL Configuration: adicionar URLs da app (`senvia-portugal-crm.lovable.app`, custom domains)
4. Settings → API: copiar **service_role key** e **DB connection string** (modo "session", porta 5432, com password)

Depois adicionas como secrets aqui (eu peço com `add_secret`):
- `NEW_SUPABASE_URL` = `https://chhmfwlimtbsyjmgtokn.supabase.co`
- `NEW_SUPABASE_SERVICE_ROLE_KEY`
- `NEW_SUPABASE_DB_URL` (formato `postgresql://postgres.chhm...:PASSWORD@aws-...pooler.supabase.com:5432/postgres`)
- `NEW_SUPABASE_ANON_KEY`

---

### Fase 1 — Modo manutenção (eu, 2 min)

- Adiciono banner global "Sistema em manutenção" + bloqueio de escritas no `AuthContext`.
- Aviso visível a todos os utilizadores.

---

### Fase 2 — Dump completo do projeto antigo (eu via script, 10-15 min)

Script `scripts/migration/dump.sh` que corre localmente OU dentro de edge function temporária:

```bash
# 1. Schema (estrutura, funcs, triggers, policies)
pg_dump "$OLD_DB_URL" --schema-only --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  -f /tmp/01_schema.sql

# 2. Auth (users + passwords bcrypt + identities + mfa)
pg_dump "$OLD_DB_URL" --data-only --no-owner \
  -t auth.users -t auth.identities -t auth.mfa_factors \
  -t auth.mfa_challenges -t auth.sessions -t auth.refresh_tokens \
  -f /tmp/02_auth_data.sql

# 3. Public data (tudo do negócio)
pg_dump "$OLD_DB_URL" --data-only --no-owner --schema=public \
  --disable-triggers \
  -f /tmp/03_public_data.sql

# 4. Storage metadata (buckets + objects rows; ficheiros vêm na Fase 4)
pg_dump "$OLD_DB_URL" --data-only --no-owner \
  -t storage.buckets -t storage.objects \
  -f /tmp/04_storage_meta.sql
```

As **passwords vêm intactas** (`encrypted_password` bcrypt) — login mantém-se sem reset.

---

### Fase 3 — Restore no novo projeto (eu, 10-15 min)

```bash
psql "$NEW_DB_URL" -f /tmp/01_schema.sql
psql "$NEW_DB_URL" -f /tmp/02_auth_data.sql
psql "$NEW_DB_URL" -c "SET session_replication_role = 'replica';" \
                  -f /tmp/03_public_data.sql \
                  -c "SET session_replication_role = 'origin';"
psql "$NEW_DB_URL" -f /tmp/04_storage_meta.sql
```

`session_replication_role = replica` evita que triggers (notify_automation_trigger, sync_sale_payment_status, etc.) disparem durante o import.

---

### Fase 4 — Migração de ficheiros de Storage (eu, 15-20 min)

Edge function `migrate-storage` que para cada bucket (`internal-requests`, `invoices`, `organization-logos`, `product-images`, `support-attachments`):
- Lista todos os objetos via Storage API antiga
- Faz `download` → `upload` para o novo projeto com mesmo path
- Reporta progresso

Os rows em `storage.objects` já foram restaurados na Fase 3 — esta fase só copia os bytes.

---

### Fase 5 — Patch de URLs hardcoded (eu via SQL no novo, 2 min)

Duas funções têm o ref antigo embutido:
- `notify_automation_trigger` → URL + anon key
- `create_organization_for_current_user` → URL + anon key

Eu corro migration no novo projeto a substituir `zppcobirzgpfcrnxznwe` pelo novo ref e a nova anon key.

---

### Fase 6 — Cron jobs + realtime (eu via SQL no novo, 3 min)

```sql
-- Recriar todos os cron jobs (check-renewal-automations, check-reminders,
-- check-trial-status, cleanup-expired-trials, process-automation-queue,
-- process-scheduled-campaigns, generate-recurring-expenses, sync-email-statuses,
-- reconcile-plans)
SELECT cron.schedule('check-renewal-automations', '0 6 * * *', $$...$$);
-- (etc)

-- Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads, public.sales, ...;
```

---

### Fase 7 — Deploy de edge functions + secrets (eu, 5 min)

- Re-deploy de todas as ~46 funções no novo projeto (script via Management API)
- Migração dos secrets das edge functions (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, APIFY_API_TOKEN, RESEND_API_KEY, etc.) — eu listo os que existem, tu confirmas valores via `add_secret` no novo

---

### Fase 8 — Switch da app (eu, 2 min)

- Atualizar `.env` + `supabase/config.toml` com novo `project_id`, URL e anon key
- `src/integrations/supabase/client.ts` e `types.ts` são regenerados automaticamente
- Push para `main` → Vercel rebuild

---

### Fase 9 — Reconfiguração externa (tu, 5 min)

- **Stripe Dashboard** → Webhooks: atualizar URL para `https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/stripe-webhook` e copiar o novo `STRIPE_WEBHOOK_SECRET` para os secrets do novo projeto
- **Brevo** → webhooks: atualizar para novo URL
- **Meta CAPI** → nada (URL fixo do Meta)
- **n8n workflows** → atualizar URLs das edge functions chamadas

---

### Fase 10 — Validação e remoção do banner (eu, 5 min)

- Login com 3 utilizadores (super admin + admin org + member) — confirmar password OK
- Verificar contagens: `users`, `orgs`, `leads`, `sales`, `proposals`, `expenses`, `stripe_commission_records` (devem bater)
- Testar 1 fluxo end-to-end: criar lead → proposta → venda → pagamento
- Testar 1 cron job (`check-renewal-automations`)
- Remover banner de manutenção
- Manter projeto antigo **pausado mas não apagado** por 7 dias como fallback

---

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Triggers disparam durante import | `session_replication_role = replica` |
| `pg_net`/`pg_cron` não ativas → restore falha | Fase 0 obriga ativação manual |
| Storage policy difere | Schema dump traz policies de `storage` |
| Stripe webhook fica apontando para o antigo | Fase 9 explícita |
| Sequências dessincronizadas após import | `SELECT setval()` para todas no fim |
| Auth schema do Supabase é gerido pelo serviço | Dumpo só tabelas de dados (`users`, `identities`, etc.), não DDL do schema `auth` |

---

### O que vou criar quando passares a build mode

1. `supabase/functions/migration-runner/index.ts` — orquestrador (dump → restore → storage → patch)
2. `supabase/functions/migrate-storage/index.ts` — copia bytes entre buckets
3. `scripts/migration/dump.sh` — pg_dump local (fallback)
4. `scripts/migration/restore.sh` — psql restore (fallback)
5. `scripts/migration/patch_urls.sql` — substitui refs hardcoded
6. `scripts/migration/recreate_cron.sql` — recria cron jobs
7. Banner de manutenção temporário em `AppLayout.tsx`

**Quando confirmares, passo a build mode e começo pelo passo 1: pedir os 4 secrets do novo projeto via `add_secret`.**
