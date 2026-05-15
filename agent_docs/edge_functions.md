# Edge Functions Reference — Senvia OS

All functions live in `supabase/functions/{name}/index.ts` (Deno runtime). Deployed automatically via Lovable on push to `main`. All have `verify_jwt = false` in `config.toml`.

## Stripe & Payments

| Function | Trigger | Purpose |
|----------|---------|---------|
| `stripe-webhook` | Stripe webhook | Handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`. Creates commission records and sale_payments. |
| `create-checkout` | Client call | Creates Stripe Checkout session for subscription. |
| `customer-portal` | Client call | Creates Stripe Customer Portal session. |
| `check-subscription` | Client call | Verifies org subscription status against Stripe. |
| `admin-stripe-stats` | Admin call | Fetches Stripe metrics for system admin dashboard. |

## Invoicing (InvoiceXpress)

| Function | Purpose |
|----------|---------|
| `issue-invoice` | Creates invoice (Fatura) in InvoiceXpress. |
| `issue-invoice-receipt` | Creates invoice-receipt (Fatura-Recibo) in InvoiceXpress. |
| `generate-receipt` | Creates receipt (Recibo) for a payment. |
| `cancel-invoice` | Cancels an invoice in InvoiceXpress. |
| `create-credit-note` | Creates credit note (Nota de Crédito). |
| `send-invoice-email` | Emails invoice PDF to client. |
| `get-invoice-details` | Fetches invoice details from InvoiceXpress API. |
| `sync-invoices` | Syncs invoices from InvoiceXpress to local DB. |
| `sync-credit-notes` | Syncs credit notes from InvoiceXpress. |
| `sync-invoicexpress-items` | Syncs product catalog from InvoiceXpress. |
| `update-invoicexpress-item` | Updates a product in InvoiceXpress. |
| `keyinvoice-auth` | Authenticates with KeyInvoice API (alternative invoicing). |

## Email & Marketing

| Function | Purpose |
|----------|---------|
| `send-template-email` | Sends email using org's email template via Brevo. |
| `send-access-email` | Sends team member access/invite email. |
| `send-proposal-email` | Sends proposal to client via email. |
| `sync-email-statuses` | Syncs email delivery statuses from Brevo. |
| `sync-campaign-sends` | Syncs campaign send records. |
| `brevo-webhook` | Receives Brevo delivery/bounce/click webhooks. |
| `process-scheduled-campaigns` | Sends campaigns scheduled for now. |

## Automations & Scheduling

| Function | Purpose |
|----------|---------|
| `process-automation` | Executes a single automation action. |
| `process-automation-queue` | Processes queued automations where `scheduled_for <= now()`. |
| `check-renewal-automations` | Finds sales due for renewal today/in 2 days, triggers email automations. |
| `check-reminders` | Processes due reminders and sends notifications. |
| `check-fidelization-alerts` | Checks client fidelization period expiry. |
| `generate-recurring-expenses` | Creates monthly copies of recurring expenses. |

## Subscriptions & Trials

| Function | Purpose |
|----------|---------|
| `check-trial-status` | Checks and updates trial expiration status per org. |
| `cleanup-expired-trials` | Downgrades/blocks orgs with expired trials. |

## Leads & Prospects

| Function | Purpose |
|----------|---------|
| `submit-lead` | Public API: creates a lead from external form. |
| `update-lead` | Updates lead fields (used by automations). |
| `generate-prospects` | Scrapes prospects via Apify and imports them. |
| `check-prospect-job` | Polls Apify job status and imports results when complete. |

## Team Management

| Function | Purpose |
|----------|---------|
| `create-team-member` | Creates new user + org membership + sends invite. |
| `get-team-members` | Lists team members for an org. |
| `manage-team-member` | Updates/deactivates team member. |

## Notifications

| Function | Purpose |
|----------|---------|
| `send-push-notification` | Sends web push notification via VAPID. |
| `notify-finance-request` | Notifies admins of new finance requests. |
| `notify-request-status` | Notifies requester of status change. |

## Other

| Function | Purpose |
|----------|---------|
| `otto-chat` | AI chat assistant (Otto) using Claude API. |
| `meta-capi-event` | Sends conversion events to Meta Conversions API. |
| `store-api` | Public e-commerce store API (products, orders). |

## Cron Jobs (pg_cron via Supabase Dashboard)

These functions are called periodically via `pg_cron` + `pg_net`:
- `check-renewal-automations` — daily, checks renewal dates
- `check-reminders` — periodic, processes due reminders
- `check-trial-status` — daily, expires trials
- `cleanup-expired-trials` — daily cleanup
- `process-automation-queue` — frequent, processes scheduled automations
- `process-scheduled-campaigns` — frequent, sends due campaigns
- `generate-recurring-expenses` — daily at 06:00, generates monthly recurring expenses
- `sync-email-statuses` — periodic, syncs Brevo delivery statuses
