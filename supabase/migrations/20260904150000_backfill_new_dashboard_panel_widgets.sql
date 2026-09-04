-- ============================================================
-- Backfill: the big dashboard panels (Compromisso, Análise do mês, etc.)
-- become togglable widgets, not hardcoded
-- ============================================================
-- Until now these always rendered for telecom, with no way to hide them.
-- Gating them behind organization_profiles.dashboard_widgets, like every
-- other widget, means: any profile that has NEVER been customized keeps
-- seeing them (added to the telecom niche defaults in code), but a profile
-- that HAS been customized has its own array that fully replaces the
-- defaults — so without this backfill, every already-customized profile
-- would suddenly lose every one of these panels the moment the code change
-- ships, since they were never in that array to begin with.
--
-- This adds each new panel type, marked visible, to every profile that
-- already has a custom dashboard_widgets array and doesn't have it yet.
-- Harmless no-op for a non-telecom profile — Dashboard.tsx only renders
-- these panels inside `{isTelecom && ...}` regardless of this list.

DO $$
DECLARE
  _new_types text[] := ARRAY[
    'commitment_panel', 'telecom_lifecycle_panel', 'sales_performance_panel',
    'metrics_panel', 'activations_panel', 'fidelization_alerts_widget',
    'calendar_alerts_widget', 'tasks_widget', 'commissions_widget'
  ];
  _profile RECORD;
  _existing_types text[];
  _additions jsonb;
  _t text;
BEGIN
  FOR _profile IN
    SELECT id, dashboard_widgets FROM public.organization_profiles WHERE dashboard_widgets IS NOT NULL
  LOOP
    SELECT COALESCE(array_agg(elem->>'type'), ARRAY[]::text[])
      INTO _existing_types
    FROM jsonb_array_elements(_profile.dashboard_widgets) AS elem;

    _additions := '[]'::jsonb;
    FOREACH _t IN ARRAY _new_types LOOP
      IF NOT (_t = ANY(_existing_types)) THEN
        _additions := _additions || jsonb_build_array(jsonb_build_object('type', _t, 'is_visible', true));
      END IF;
    END LOOP;

    IF jsonb_array_length(_additions) > 0 THEN
      UPDATE public.organization_profiles
      SET dashboard_widgets = dashboard_widgets || _additions
      WHERE id = _profile.id;
    END IF;
  END LOOP;
END $$;
