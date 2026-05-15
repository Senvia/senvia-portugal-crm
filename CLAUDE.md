# Senvia OS — CRM SaaS

## Project Overview

Multi-tenant CRM for Portuguese businesses. Manages leads, sales, proposals, clients, finance (payments, invoices, expenses, commissions), marketing (email campaigns, automations), e-commerce, and calendar. Built on Lovable, deployed via Vercel + Supabase.

Current version: see `src/lib/constants.ts` → `APP_VERSION`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite (SWC), React Router v6 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix primitives), Framer Motion |
| State | TanStack React Query (server), Zustand (client), localStorage (filter persistence) |
| Backend | Supabase: PostgreSQL, Auth, RLS, Storage, Edge Functions (Deno) |
| Deploy | Vercel (frontend, auto-deploy from `main`), Lovable (Edge Functions) |
| External | Stripe (subscriptions/payments), InvoiceXpress (invoicing), Brevo (transactional email), Meta CAPI, Apify (prospect scraping) |
| PWA | Service Worker (`public/sw.js`) for push notifications |

## Project Structure

```
src/
├── components/     # UI by domain: finance/, sales/, leads/, clients/, marketing/, ui/ (52 shadcn components)
├── contexts/       # AuthContext (auth, org selection, MFA, multi-org)
├── hooks/          # ~99 hooks, one per entity/feature (useLeads, useSales, useExpenses, etc.)
├── integrations/   # Supabase client + auto-generated types
├── lib/            # Utilities: format, export, constants, pipeline templates
├── pages/          # Route-level components, subdirectories for nested routes
├── stores/         # Zustand stores (dashboard period, Otto chat)
├── types/          # Domain types: sales.ts, finance.ts, clients.ts, etc.
supabase/
├── functions/      # ~45 Edge Functions (Deno), one folder each
├── migrations/     # ~219 SQL migrations (sequential timestamps)
├── config.toml     # Edge Function settings (verify_jwt flags)
public/
├── sw.js           # Push notification Service Worker
├── manifest.webmanifest
```

## Environment & Setup

```bash
npm install        # or bun install
npm run dev        # Vite dev server on :8080
```

Required env vars (see `.env`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ref

Edge Functions use Supabase-managed secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, etc.) — configured in Supabase Dashboard, not in `.env`.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `git push origin main` | Deploy frontend (Vercel auto-deploys) + Edge Functions (Lovable auto-deploys) |

No test suite exists. Verify changes with `npx tsc --noEmit --skipLibCheck` before pushing.

## Architecture & Conventions

**File naming:** PascalCase for components (`AddExpenseModal.tsx`), camelCase for hooks (`useExpenses.ts`), kebab-case for types (`field-settings.ts`).

**Data flow:** Component → hook (React Query) → Supabase client → PostgreSQL (with RLS). Mutations invalidate related query keys. Edge Functions handle server-side logic (webhooks, email sending, invoice generation).

**Multi-tenancy:** Every table has `organization_id`. RLS policies use `is_org_member(auth.uid(), organization_id)` to isolate data. Auth context provides the active organization.

**Path alias:** `@/` maps to `./src/`.

**Hooks pattern:** Each hook file exports query hooks (`useExpenses`) and mutation hooks (`useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`). Queries use `useQuery`, mutations use `useMutation` with `queryClient.invalidateQueries` on success.

**Filter persistence:** UI filters use `usePersistedState` hook (localStorage wrapper) with versioned keys like `payments-status-v1`.

**Commit convention:** Portuguese, prefixed: `Fix:`, `Refactor:`, `Hotfix vX.Y.Z:`. Always include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.

**Announcements/versions:** Update `APP_VERSION` in `src/lib/constants.ts`. Create announcement via SQL INSERT into `app_announcements`. Popup shows once per user (tracked by announcement ID in localStorage).

## Database

Supabase PostgreSQL with RLS enabled on all tables. See [agent_docs/database_schema.md](agent_docs/database_schema.md) for full schema.

**Key tables:** organizations, profiles, organization_members, crm_clients, leads, pipeline_stages, sales, sale_items, sale_payments, proposals, expenses, expense_categories, invoices, credit_notes, stripe_commission_records, email_templates, campaigns, automation_queue, app_announcements.

**Multi-tenancy:** All business tables have `organization_id` FK. RLS policies enforce org-level isolation.

**Migrations:** In `supabase/migrations/`. Run SQL directly in Supabase SQL Editor — no CLI migration runner needed.

### Database Rules

Before creating any new table, ask these questions first:
1. What are the main business entities?
2. What relationships exist between them?
3. Who accesses what? (to define correct RLS)
4. What data can never be deleted vs. temporary data?
5. Will there be multi-tenancy? (multiple isolated clients)

Based on the answers, create:
- Complete schema with correct data types
- RLS policies for each table
- Indexes for the most common queries
- Documentation in `agent_docs/database_schema.md`

**Never create a table without explicit schema approval.**

## External Services

| Service | Purpose | Config location | Env vars |
|---------|---------|----------------|----------|
| Stripe | Subscriptions, payments, commissions | `supabase/functions/stripe-webhook/` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| InvoiceXpress | Portuguese invoicing (FT, RC, FR, NC) | `supabase/functions/issue-invoice/`, `generate-receipt/` | Per-org: `invoicexpress_api_key`, `invoicexpress_account_name` in organizations table |
| Brevo | Transactional email, campaigns | `supabase/functions/send-template-email/` | `BREVO_API_KEY` |
| Meta CAPI | Facebook conversion tracking | `supabase/functions/meta-capi-event/` | Per-org config |
| Apify | Prospect scraping | `supabase/functions/generate-prospects/` | `APIFY_API_TOKEN` |

See [agent_docs/edge_functions.md](agent_docs/edge_functions.md) for the full Edge Functions reference.

## Development Rules

1. **Never commit secrets** — `.env` is gitignored. Supabase secrets are managed in Dashboard.
2. **Always verify TypeScript** before pushing: `npx tsc --noEmit --skipLibCheck`.
3. **Deploy = git push to `main`**. Vercel and Lovable auto-deploy. Never push to `master`.
4. **Edge Function deploy** happens automatically via Lovable on push to `main`.
5. **SQL changes** run directly in Supabase SQL Editor. No migration CLI.
6. **RLS is mandatory** on every new table. Use `is_org_member()` pattern.
7. **Never delete data** without user confirmation. Prefer soft deletes where applicable.
8. **Language:** UI text in Portuguese (pt-PT). Code, comments, and docs in English. Commits in Portuguese.
9. **No tests exist.** Verify manually. Don't add test infrastructure unless explicitly asked.
10. **Stripe agency org ID** is hardcoded: `06fe9e1d-9670-45b0-8717-c5a6e90be380` (in stripe-webhook).

## Agent Docs

| File | Description |
|------|-------------|
| [database_schema.md](agent_docs/database_schema.md) | Main tables, relationships, and RLS patterns |
| [edge_functions.md](agent_docs/edge_functions.md) | All 45 Edge Functions categorized by domain |
| [deployment.md](agent_docs/deployment.md) | Deploy flow, environment setup, and cron jobs |

## TODO (fill manually)

- [ ] Document Apify scraper configuration and templates
- [ ] Document WhatsApp integration (instance, API key, base URL per org)
- [ ] Document Otto chat (AI assistant) configuration
- [ ] Document e-commerce store-api public endpoints
- [ ] Add Brevo webhook event types handled
