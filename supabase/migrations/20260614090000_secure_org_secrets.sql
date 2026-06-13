-- SECURITY #1 — stop leaking org secrets through the over-broad anon policy.
--
-- The policy "Public can verify organization by slug" used USING (true) for
-- anon + authenticated. RLS is row-level, not column-level, so it exposed
-- EVERY column of EVERY organization (chatwoot_account_token, whatsapp_api_key,
-- brevo_api_key, invoicexpress_api_key, ...) to anyone holding the bundled anon
-- key, and let any authenticated user read other tenants' secrets.
--
-- Legitimate access is already covered by:
--   * "Users view own organization"  -> members read their own org (Settings).
--   * "Super admin full access organizations" -> agency reads all orgs.
-- Nothing in the app reads organizations anonymously by slug via PostgREST
-- (signup uses the is_slug_available RPC), so the broad policy can be removed.
DROP POLICY IF EXISTS "Public can verify organization by slug" ON public.organizations;

-- Sanctioned public slug-verification path: returns ONLY non-sensitive fields,
-- never secrets. Use this instead of selecting from organizations as anon.
CREATE OR REPLACE FUNCTION public.get_org_public_by_slug(_slug text)
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT o.id, o.name, o.slug
  FROM public.organizations o
  WHERE o.slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_public_by_slug(text) TO anon, authenticated;
