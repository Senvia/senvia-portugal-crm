-- Trial activation overview view (Sprint 3 of the activation initiative).
--
-- One row per trial organization, combining the activation signal (first_*_at,
-- last_active_at from 20260622120000_org_activity_signal.sql) with the trial /
-- payment state. Powers the super-admin activation dashboard and the activation
-- metrics.
--
-- SECURITY: declared WITH (security_invoker = true) so the view runs with the
-- CALLER's privileges and the organizations RLS applies normally. A regular user
-- therefore only sees their own org row; a super_admin (who has a full-access RLS
-- policy on organizations) sees every trial. No privilege escalation.
--
-- Activation levels (Amora's framework):
--   none     : created nothing yet
--   minimum  : started populating (has a lead or a client)
--   medium   : reached the "aha" (registered a sale = saw money)
--   advanced : sale + proposal (using the full value loop)

CREATE OR REPLACE VIEW public.trial_activation_overview
WITH (security_invoker = true) AS
SELECT
  o.id                       AS organization_id,
  o.name,
  o.created_at,
  o.trial_ends_at,
  o.plan,
  o.first_paid_at,
  o.current_period_end,
  o.last_active_at,
  o.first_lead_at,
  o.first_client_at,
  o.first_sale_at,
  o.first_proposal_at,

  -- Whole days left in the trial (negative once expired).
  CASE WHEN o.trial_ends_at IS NOT NULL
       THEN ceil(extract(epoch FROM (o.trial_ends_at - now())) / 86400.0)::int
       END                   AS trial_days_left,

  -- Hours since the org last did something meaningful (NULL = never active).
  CASE WHEN o.last_active_at IS NOT NULL
       THEN floor(extract(epoch FROM (now() - o.last_active_at)) / 3600.0)::int
       END                   AS hours_since_active,

  (o.first_paid_at IS NOT NULL)                                          AS is_paying,
  (o.first_lead_at IS NOT NULL OR o.first_client_at IS NOT NULL)         AS activated_min,
  (o.first_sale_at IS NOT NULL)                                          AS activated_med,
  (o.first_sale_at IS NOT NULL AND o.first_proposal_at IS NOT NULL)      AS activated_adv,

  CASE
    WHEN o.first_sale_at IS NOT NULL AND o.first_proposal_at IS NOT NULL THEN 'advanced'
    WHEN o.first_sale_at IS NOT NULL                                     THEN 'medium'
    WHEN o.first_lead_at IS NOT NULL OR o.first_client_at IS NOT NULL    THEN 'minimum'
    ELSE 'none'
  END                        AS activation_level,

  CASE
    WHEN o.first_paid_at IS NOT NULL                                     THEN 'paying'
    WHEN o.trial_ends_at IS NOT NULL AND o.trial_ends_at < now()         THEN 'expired'
    ELSE 'active'
  END                        AS trial_status

FROM public.organizations o
WHERE COALESCE(o.billing_exempt, false) = false
  AND o.trial_ends_at IS NOT NULL;

COMMENT ON VIEW public.trial_activation_overview IS
  'Per-trial-org activation + conversion funnel. security_invoker so org RLS applies; super_admins see all trials, regular users only their own org.';
