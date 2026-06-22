-- Per-module onboarding dismissal (unified onboarding, Fase 1).
--
-- We reuse the existing org_onboarding_state table instead of creating a new one.
-- The "completed" state of each module is DERIVED from real signals
-- (first_lead_at, first_sale_at, ...), so the only thing we need to persist is
-- when the user said "Agora não" to a module's peek bubble. That goes in a single
-- jsonb map: { "leads": "2026-06-22T10:00:00Z", "sales": null, ... }.

ALTER TABLE public.org_onboarding_state
  ADD COLUMN IF NOT EXISTS module_dismissed jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.org_onboarding_state.module_dismissed IS
  'Map of module_key -> ISO timestamp when the user dismissed that module''s onboarding peek. Absent/null key = not dismissed. Completion is derived from real signals, not stored here.';

-- The existing migration granted SELECT + UPDATE to members but NOT INSERT, so
-- the frontend (user-scoped client) cannot create the row the first time a user
-- dismisses a module before Otto ever wrote one. Add a member INSERT policy so
-- the dismiss upsert works. Otto (service_role) keeps bypassing RLS as before.
DROP POLICY IF EXISTS org_onboarding_state_insert ON public.org_onboarding_state;
CREATE POLICY org_onboarding_state_insert ON public.org_onboarding_state
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));
