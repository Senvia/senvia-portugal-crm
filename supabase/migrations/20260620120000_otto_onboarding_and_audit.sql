-- Otto 2.0 — onboarding state tracking + write-action audit log.
--
-- org_onboarding_state: one row per organization, tracks where the org is in the
-- conversational onboarding driven by Otto (and read by the frontend FAB badge).
-- otto_action_log: append-only audit trail of every WRITE action Otto performs
-- (create lead/client, configure integrations, etc.) for accountability.
--
-- Both tables are written by the otto edge function via service_role (bypasses
-- RLS). The RLS policies below exist so the FRONTEND (user-scoped client) can
-- READ them. Otto degrades gracefully if these tables are absent, but onboarding
-- mode and the badge only light up once this migration is applied.

-- ─────────────────────────────────────────────────────────────────────────────
-- org_onboarding_state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_onboarding_state (
  organization_id   UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_stage     TEXT NOT NULL DEFAULT 'WELCOME',
  stages_completed  TEXT[] NOT NULL DEFAULT '{}',
  dismissed         BOOLEAN NOT NULL DEFAULT false,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_onboarding_state ENABLE ROW LEVEL SECURITY;

-- Members of the org can read their onboarding state (used by the FAB badge).
DROP POLICY IF EXISTS org_onboarding_state_select ON public.org_onboarding_state;
CREATE POLICY org_onboarding_state_select ON public.org_onboarding_state
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

-- Admins can mark it dismissed/updated directly from the UI if needed.
DROP POLICY IF EXISTS org_onboarding_state_update ON public.org_onboarding_state;
CREATE POLICY org_onboarding_state_update ON public.org_onboarding_state
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- otto_action_log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otto_action_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool              TEXT NOT NULL,
  args              JSONB,
  result            JSONB,
  success           BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otto_action_log_org_idx
  ON public.otto_action_log (organization_id, created_at DESC);

ALTER TABLE public.otto_action_log ENABLE ROW LEVEL SECURITY;

-- Admins/members can read their org's audit trail. Inserts happen via
-- service_role only (the edge function), so no INSERT policy is granted.
DROP POLICY IF EXISTS otto_action_log_select ON public.otto_action_log;
CREATE POLICY otto_action_log_select ON public.otto_action_log
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
