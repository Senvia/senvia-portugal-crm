-- Distinguish trial customers from paying customers.
--
-- Once an organization makes its first successful payment, it stops being
-- treated as a trial: no more "trial expired" blocker, the cleanup-expired-
-- trials cron leaves it alone, and overdue blocking shows a "renew your plan"
-- message instead of a trial-end one.
--
-- Schema:
--   - first_paid_at         : NULL = still in trial track. Filled = paying customer (forever).
--   - current_period_end    : end date of the current paid period (from Stripe).
--                             Adding 4 days of grace before blocking for overdue.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS first_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

COMMENT ON COLUMN public.organizations.first_paid_at IS
  'Timestamp of the org''s first successful Stripe payment. NULL = trial customer (subject to trial_ends_at logic and to the trial-cleanup cron). Non-NULL = paying customer (never reverts).';

COMMENT ON COLUMN public.organizations.current_period_end IS
  'End of the current paid Stripe period. Source of truth for the "renew by" date. Combined with a 4-day grace window before showing the plan-expired blocker.';

-- Heuristic backfill: orgs whose `plan` was promoted past `starter` are
-- treated as having paid (we don't have an exact first-payment date, so we
-- use trial start = trial_ends_at - 14d). check-subscription will refine
-- this on the next call for orgs that actually have a live Stripe sub.
UPDATE public.organizations
SET first_paid_at = COALESCE(
  trial_ends_at - INTERVAL '14 days',
  created_at,
  now()
)
WHERE first_paid_at IS NULL
  AND plan IS NOT NULL
  AND plan <> 'starter'
  AND billing_exempt = false;
