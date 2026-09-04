-- ============================================================
-- New BDS product: "Fibra/Satélite"
-- ============================================================
-- One product, no operator link. The operator pays the org 200€; whoever
-- makes the sale gets 30% of that (60€), the org keeps the other 140€.
-- The 30% is a flat rate for anyone selling it — one split row per currently
-- active member of the org, generated from organization_members so nobody
-- has to be named by hand and nobody active gets missed.

DO $$
DECLARE
  _org_id  uuid := '78a42249-4dd6-4e6c-b78b-fe862da7e956';
  _catalog jsonb;
  _splits  jsonb;
  _entry   jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind', 'user',
           'user_id', om.user_id,
           'type', 'pct',
           'value', 30
         )), '[]'::jsonb)
    INTO _splits
  FROM public.organization_members om
  WHERE om.organization_id = _org_id AND om.is_active;

  _entry := jsonb_build_object(
    'name', 'Fibra/Satélite',
    'price', 200,
    'has_commission', true,
    'commission_pct', 30,
    'commission_type', 'pct',
    'splits', _splits,
    'operator_pays', 200
  );

  SELECT servicos_products_config::jsonb INTO _catalog
  FROM public.organizations WHERE id = _org_id;
  IF _catalog IS NULL OR jsonb_typeof(_catalog) <> 'array' THEN
    _catalog := '[]'::jsonb;
  END IF;

  UPDATE public.organizations
  SET servicos_products_config = (_catalog || jsonb_build_array(_entry))::jsonb
  WHERE id = _org_id;
END $$;
