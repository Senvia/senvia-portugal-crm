-- trial_activation_counts view: per-org raw counts for trial monitoring.
--
-- Separate from public.trial_activation_overview (activation-level funnel view) —
-- this one exposes plain counts (leads/clients/sales/proposals/onboarding modules)
-- rather than derived activation levels. Does not replace or modify the existing view.
--
-- SECURITY: declared WITH (security_invoker = true) so the view runs with the
-- CALLER's privileges and organizations RLS applies normally.

CREATE OR REPLACE VIEW public.trial_activation_counts
WITH (security_invoker = true) AS
SELECT
  o.id                                      AS organization_id,
  o.name,
  floor(extract(epoch FROM (now() - o.created_at)) / 86400.0)::int
                                             AS days_since_registration,
  COALESCE(leads.cnt, 0)                    AS total_leads,
  COALESCE(clients.cnt, 0)                  AS total_clients,
  COALESCE(sales.cnt, 0)                    AS total_sales,
  COALESCE(proposals.cnt, 0)                AS total_proposals,
  COALESCE(cardinality(oos.stages_completed), 0)
                                             AS onboarding_module_count,
  (SELECT count(*)::int
     FROM jsonb_each(o.trial_reminders_sent) AS r(key, value)
    WHERE r.value = 'true'::jsonb)          AS trial_reminders_sent,
  o.last_active_at
FROM public.organizations o
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.leads l WHERE l.organization_id = o.id
) leads ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.crm_clients c WHERE c.organization_id = o.id
) clients ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.sales s WHERE s.organization_id = o.id
) sales ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.proposals p WHERE p.organization_id = o.id
) proposals ON true
LEFT JOIN public.org_onboarding_state oos ON oos.organization_id = o.id;

COMMENT ON VIEW public.trial_activation_counts IS
  'Per-org raw counts (leads/clients/sales/proposals/onboarding modules) for trial monitoring. security_invoker so org RLS applies.';
