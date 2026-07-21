-- Safe, public-facing organization data for the frontend.
-- NEVER expose API keys, tokens, or secrets through this function.
-- If a new non-sensitive column is added to organizations, add it here too.
CREATE OR REPLACE FUNCTION public.get_org_public_data(_org_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  code text,
  public_key text,
  plan text,
  created_at timestamptz,
  form_settings jsonb,
  niche text,
  enabled_modules jsonb,
  logo_url text,
  integrations_enabled jsonb,
  tax_config jsonb,
  sales_settings jsonb,
  ai_qualification_rules text,
  msg_template_hot text,
  msg_template_warm text,
  msg_template_cold text,
  ai_response_mode text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.name, o.slug, o.code, o.public_key, o.plan,
    o.created_at, o.form_settings, o.niche, o.enabled_modules,
    o.logo_url, o.integrations_enabled, o.tax_config, o.sales_settings,
    o.ai_qualification_rules, o.msg_template_hot, o.msg_template_warm,
    o.msg_template_cold, o.ai_response_mode
  FROM public.organizations o
  WHERE o.id = _org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_public_data(uuid) TO authenticated;
