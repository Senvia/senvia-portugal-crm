-- Activation signal infrastructure (Sprint 0 of the activation initiative).
--
-- Adds per-organization activity timestamps so we can measure the activation
-- funnel (trial dashboard, inactivity alerts, activation metrics) WITHOUT
-- instrumenting the whole frontend. Timestamps are stamped by lightweight
-- AFTER INSERT triggers on the core activation entities (leads, clients,
-- sales, proposals).
--
-- Why this matters: today the only "is this trial alive?" signal is indirect
-- (otto_action_log writes). The activation funnel needs a clean answer to
-- "did this org create its first lead/client/sale/proposal, and when was it
-- last active?". These columns provide exactly that, cheaply.
--
-- Note: the conversion signal (first_paid_at / current_period_end) already
-- exists and is correct (see 20260601100000_payer_status.sql and the fix in
-- 20260617120000_fix_first_paid_at_backfill.sql). This migration only adds the
-- ACTIVATION signal, not the payment signal.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS last_active_at      timestamptz,
  ADD COLUMN IF NOT EXISTS first_lead_at       timestamptz,
  ADD COLUMN IF NOT EXISTS first_client_at     timestamptz,
  ADD COLUMN IF NOT EXISTS first_sale_at       timestamptz,
  ADD COLUMN IF NOT EXISTS first_proposal_at   timestamptz,
  ADD COLUMN IF NOT EXISTS first_inbox_reply_at timestamptz;

COMMENT ON COLUMN public.organizations.last_active_at IS
  'Last time the org did something meaningful (created a lead/client/sale/proposal). Coarse activity heartbeat for inactivity detection. Updated at most every 5 minutes to limit write churn.';
COMMENT ON COLUMN public.organizations.first_lead_at IS
  'When the org created its first lead. NULL = never. Part of the activation funnel.';
COMMENT ON COLUMN public.organizations.first_client_at IS
  'When the org created its first client. NULL = never. Part of the activation funnel.';
COMMENT ON COLUMN public.organizations.first_sale_at IS
  'When the org registered its first sale (the "aha = saw money" moment). NULL = never. Part of the activation funnel.';
COMMENT ON COLUMN public.organizations.first_proposal_at IS
  'When the org created its first proposal. NULL = never. Part of the activation funnel.';
COMMENT ON COLUMN public.organizations.first_inbox_reply_at IS
  'Reserved for inbox activation tracking (first outbound reply). Not yet wired (inbox lives in Chatwoot). Populated by a future migration.';

-- ---------------------------------------------------------------------------
-- Generic stamp function. The target "first_*" column name is passed as the
-- first trigger argument (TG_ARGV[0]); it is developer-controlled, never user
-- input, so the dynamic SQL is safe. SECURITY DEFINER so the stamp succeeds
-- regardless of who inserted the row (RLS on the source table already gated
-- the insert itself).
--
-- The WHERE guard limits write amplification: the organizations row is only
-- updated when the heartbeat is stale (>5 min) or the specific first_* column
-- is still NULL. So a burst of inserts for the same org touches the org row at
-- most once per ~5 minutes (plus once to set each first_* column).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_org_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col text := TG_ARGV[0];
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'UPDATE public.organizations
        SET last_active_at = now(),
            %1$I = COALESCE(%1$I, now())
      WHERE id = $1
        AND (last_active_at IS NULL
             OR last_active_at < now() - interval ''5 minutes''
             OR %1$I IS NULL)',
    v_col
  ) USING NEW.organization_id;

  RETURN NEW;
END;
$$;

-- Triggers on the four activation entities.
DROP TRIGGER IF EXISTS trg_stamp_activity_leads ON public.leads;
CREATE TRIGGER trg_stamp_activity_leads
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.stamp_org_activity('first_lead_at');

DROP TRIGGER IF EXISTS trg_stamp_activity_clients ON public.crm_clients;
CREATE TRIGGER trg_stamp_activity_clients
  AFTER INSERT ON public.crm_clients
  FOR EACH ROW EXECUTE FUNCTION public.stamp_org_activity('first_client_at');

DROP TRIGGER IF EXISTS trg_stamp_activity_sales ON public.sales;
CREATE TRIGGER trg_stamp_activity_sales
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.stamp_org_activity('first_sale_at');

DROP TRIGGER IF EXISTS trg_stamp_activity_proposals ON public.proposals;
CREATE TRIGGER trg_stamp_activity_proposals
  AFTER INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.stamp_org_activity('first_proposal_at');

-- ---------------------------------------------------------------------------
-- Backfill from existing data so the dashboard is not empty for current orgs.
-- Each first_*_at = earliest created_at of that entity for the org.
-- ---------------------------------------------------------------------------
UPDATE public.organizations o
SET first_lead_at = sub.min_at
FROM (SELECT organization_id, min(created_at) AS min_at FROM public.leads GROUP BY organization_id) sub
WHERE o.id = sub.organization_id AND o.first_lead_at IS NULL;

UPDATE public.organizations o
SET first_client_at = sub.min_at
FROM (SELECT organization_id, min(created_at) AS min_at FROM public.crm_clients GROUP BY organization_id) sub
WHERE o.id = sub.organization_id AND o.first_client_at IS NULL;

UPDATE public.organizations o
SET first_sale_at = sub.min_at
FROM (SELECT organization_id, min(created_at) AS min_at FROM public.sales GROUP BY organization_id) sub
WHERE o.id = sub.organization_id AND o.first_sale_at IS NULL;

UPDATE public.organizations o
SET first_proposal_at = sub.min_at
FROM (SELECT organization_id, min(created_at) AS min_at FROM public.proposals GROUP BY organization_id) sub
WHERE o.id = sub.organization_id AND o.first_proposal_at IS NULL;

-- Seed last_active_at with the most recent of the known first_* signals (best
-- guess from historical data; live traffic refines it via the triggers).
UPDATE public.organizations o
SET last_active_at = GREATEST(
  COALESCE(o.first_lead_at,     'epoch'::timestamptz),
  COALESCE(o.first_client_at,   'epoch'::timestamptz),
  COALESCE(o.first_sale_at,     'epoch'::timestamptz),
  COALESCE(o.first_proposal_at, 'epoch'::timestamptz)
)
WHERE o.last_active_at IS NULL
  AND (o.first_lead_at IS NOT NULL
    OR o.first_client_at IS NOT NULL
    OR o.first_sale_at IS NOT NULL
    OR o.first_proposal_at IS NOT NULL);
