# Database Schema — Senvia OS

## Core Tables

### Authentication & Multi-tenancy

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant root. Holds plan, niche, settings (sales_settings, form_settings, tax_config, integrations_enabled), InvoiceXpress/WhatsApp credentials. |
| `profiles` | User profile. Links to `organization_id` (primary org). Has `full_name`, `avatar_url`. |
| `organization_members` | Many-to-many: users ↔ orgs. Holds `role` (admin/member), `commission_rate`, `is_active`. |

**RLS pattern:** All business tables use `organization_id` FK + policy `is_org_member(auth.uid(), organization_id)`.

### CRM Pipeline

| Table | Purpose |
|-------|---------|
| `leads` | Lead records. Has `status` (matches pipeline_stages.key), `assigned_to`, `source`, `organization_id`. |
| `pipeline_stages` | Customizable per-org. Has `key`, `label`, `order`, `is_final_positive`, `is_final_negative`. |
| `crm_clients` | Converted leads. Has `name`, `email`, `phone`, `company`, `nif` (tax ID). |
| `lead_labels` | Tags for leads. Many-to-many via `lead_label_assignments`. |
| `lead_imports` | History of CSV/bulk lead imports. |

### Sales & Payments

| Table | Purpose |
|-------|---------|
| `sales` | Sale records. Key fields: `code`, `total_value`, `status` (pending/in_progress/fulfilled/delivered/cancelled), `created_by`, `client_id`, `client_org_id`, `payment_method`, `has_recurring`, `recurring_value`, `recurring_status`, `next_renewal_date`, `last_renewal_date`. |
| `sale_items` | Line items per sale. Links to `products` table. |
| `sale_payments` | Payment schedule/records. Fields: `amount`, `payment_date`, `status` (pending/paid), `payment_method` (mbway/transfer/cash/card/check/other), `invoice_reference`. **This is what appears in Finance > Payments.** |
| `products` | Org-level product catalog. Has `price`, `is_recurring`, `tax_value`. |
| `proposals` | Proposal documents. Linked to leads/clients. |

### Finance

| Table | Purpose |
|-------|---------|
| `expenses` | Expense records. Has `category_id`, `is_recurring`, `next_recurrence_date`, `bank_account_id`. |
| `expense_categories` | Org-level categories with `name`, `color`. |
| `bank_accounts` | Bank accounts for expense tracking. |
| `invoices` | InvoiceXpress synced invoices. |
| `credit_notes` | InvoiceXpress synced credit notes. |
| `stripe_commission_records` | Commission tracking for recurring Stripe payments. Fields: `sale_id`, `user_id` (salesperson), `client_org_id`, `amount`, `commission_rate`, `commission_amount`, `stripe_invoice_id`, `plan`, `status` (pending/paid). |
| `internal_requests` | Finance requests (advances, reimbursements). |

### Marketing

| Table | Purpose |
|-------|---------|
| `email_templates` | Reusable email templates with automation triggers. |
| `campaigns` | Email campaigns with scheduling. |
| `campaign_sends` | Individual send records per campaign. |
| `contact_lists` | Segmented contact lists for campaigns. |
| `automation_queue` | Queued automation actions with `scheduled_for`. |

### System

| Table | Purpose |
|-------|---------|
| `app_announcements` | Version update popups. Has `title`, `content` (Markdown), `version`, `is_active`, `expires_at`. |
| `calendar_events` | Per-org calendar. |
| `reminders` | Scheduled reminders for leads/sales. |

## Key Relationships

```
organizations ─┬── profiles (1:N via organization_id)
               ├── organization_members (1:N, links users to orgs)
               ├── leads (1:N)
               ├── crm_clients (1:N)
               ├── sales (1:N) ──── sale_items (1:N) ──── products
               │                └── sale_payments (1:N)
               ├── proposals (1:N)
               ├── expenses (1:N) ── expense_categories
               ├── stripe_commission_records (1:N)
               ├── email_templates (1:N)
               └── campaigns (1:N)

sales.client_id → crm_clients.id
sales.client_org_id → organizations.id (client's org, for Stripe matching)
sales.created_by → profiles.id (salesperson, used for commissions)
stripe_commission_records.user_id → profiles.id
stripe_commission_records.sale_id → sales.id
```

## RLS Patterns

All tables use Row Level Security. Common patterns:

```sql
-- SELECT: org members can view
CREATE POLICY "Members can view [table]"
  ON public.[table] FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- INSERT: org members can create
CREATE POLICY "Members can insert [table]"
  ON public.[table] FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- UPDATE: org members can update
CREATE POLICY "Members can update [table]"
  ON public.[table] FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Service role (Edge Functions): full access
CREATE POLICY "Service role can insert [table]"
  ON public.[table] FOR INSERT WITH CHECK (true);
```

## Commission Flow

1. **Stripe webhook** (`invoice.paid`) → creates `stripe_commission_records` + `sale_payments`
2. **Manual renewal** (`useRenewSale`) → creates `stripe_commission_records` + `sale_payments`
3. **Admin marks paid** → updates `stripe_commission_records.status = 'paid'` + creates `expenses` record

Rate resolution: `organizations.sales_settings.commission_percentage` (global) > `organization_members.commission_rate` (per-member) > 0.

## Payment Method Values

Enum-like string: `mbway`, `transfer`, `cash`, `card`, `check`, `other`. Labels in `src/types/sales.ts` → `PAYMENT_METHOD_LABELS`.
