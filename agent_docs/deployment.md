# Deployment — Senvia OS

## Overview

| Component | Platform | Trigger | Branch |
|-----------|----------|---------|--------|
| Frontend (React SPA) | Vercel | Auto-deploy on push | `main` |
| Edge Functions (Deno) | Supabase via Lovable | Auto-deploy on push | `main` |
| Database migrations | Manual | SQL Editor in Supabase Dashboard | N/A |
| Cron jobs | Supabase | pg_cron (configured in SQL Editor) | N/A |

## Deploy Steps

### Standard deploy (frontend + Edge Functions)

```bash
git add <files>
git commit -m "Fix: description"
git push origin main
```

Both Vercel and Lovable pick up the push automatically. No separate deploy command needed.

### Database changes

Run SQL directly in **Supabase Dashboard > SQL Editor**. There is no CLI-based migration runner.

For new tables, always:
1. Create the table with correct types
2. Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
3. Create SELECT/INSERT/UPDATE/DELETE policies using `is_org_member()` pattern
4. Add indexes for columns used in WHERE/JOIN clauses
5. Document in `agent_docs/database_schema.md`

### Version bumps

1. Update `APP_VERSION` in `src/lib/constants.ts`
2. Create announcement via SQL:
```sql
INSERT INTO app_announcements (id, title, content, version, is_active, published_at)
VALUES (gen_random_uuid(), 'Title', 'Markdown content', 'vX.Y.Z', true, now());
```
3. Commit and push

## Environment

### Vercel

- Auto-deploys from `main` branch
- SPA routing via `vercel.json` rewrites (catch-all to `/index.html`)
- Service Worker files excluded from rewrite (`sw.js`, `service-worker.js`)
- No build-time env vars needed (Supabase config comes from `.env` baked at build)

### Supabase

- Project ref: `zppcobirzgpfcrnxznwe`
- URL: `https://zppcobirzgpfcrnxznwe.supabase.co`
- Edge Functions secrets managed in Supabase Dashboard > Edge Functions > Secrets
- Key secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`, `APIFY_API_TOKEN`

### Cron Jobs (pg_cron)

Configured via SQL in Supabase Dashboard. Pattern:

```sql
SELECT cron.schedule(
  'job-name',
  '0 6 * * *',  -- cron expression
  $$
  SELECT net.http_post(
    url := 'https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/function-name',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Requires `pg_net` and `pg_cron` extensions enabled.

## Important Notes

- **Never push to `master`** — Vercel deploys from `main` only. A `master` branch exists but is not used.
- **Never use `--force` push** without explicit approval.
- **TypeScript check before push:** `npx tsc --noEmit --skipLibCheck`
- **No test suite exists.** Manual verification only.
- **Lovable handles Edge Function deployment** — do NOT use `supabase functions deploy` CLI unless Lovable access is unavailable.

## Stripe Webhook Setup

The Stripe webhook endpoint is: `https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/stripe-webhook`

Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

Product-to-plan mapping is hardcoded in `stripe-webhook/index.ts`:
```
prod_U0wAc7Tuy8w6gA → starter
prod_U0wGoA4odOBHOZ → pro
prod_U0wG6doz0zgZFV → elite
```

Agency org ID (Senvia): `06fe9e1d-9670-45b0-8717-c5a6e90be380` — hardcoded in webhook for commission tracking.
