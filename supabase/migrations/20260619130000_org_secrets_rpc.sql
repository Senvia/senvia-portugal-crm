-- C5 / Part A (SAFE, additive — run FIRST, before deploying the frontend).
-- Provides a single, future-proof way for the app to load the active organization
-- WITHOUT the integration secrets. Returns the whole row as jsonb minus the secret
-- columns, plus boolean has_* flags, and only to a member (or super_admin) of the org.
-- SECURITY DEFINER so it can still read the secrets to compute the flags; the actual
-- columns are revoked from `authenticated` in Part B once the frontend uses this.

CREATE OR REPLACE FUNCTION public.get_active_organization(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.organizations;
BEGIN
  -- AuthZ: only an active member of the org (or a super_admin) may load it.
  IF NOT (
    public.is_org_member(auth.uid(), p_org_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO o FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Strip the secret columns (only these are enumerated; every other column,
  -- including future ones, is passed through automatically) and add has_* flags.
  RETURN (to_jsonb(o)
    - 'brevo_api_key'
    - 'invoicexpress_api_key'
    - 'whatsapp_api_key'
    - 'keyinvoice_password'
    - 'keyinvoice_token'
    - 'keyinvoice_sid'
    - 'chatwoot_account_token'
    - 'chatwoot_webhook_secret'
    - 'meta_conversions_api_token'
  ) || jsonb_build_object(
    'has_brevo_key',        (o.brevo_api_key IS NOT NULL AND o.brevo_api_key <> ''),
    'has_invoicexpress_key',(o.invoicexpress_api_key IS NOT NULL AND o.invoicexpress_api_key <> ''),
    'has_whatsapp_key',     (o.whatsapp_api_key IS NOT NULL AND o.whatsapp_api_key <> ''),
    'has_keyinvoice',       (o.keyinvoice_password IS NOT NULL AND o.keyinvoice_password <> ''),
    'has_chatwoot_token',   (o.chatwoot_account_token IS NOT NULL AND o.chatwoot_account_token <> ''),
    'has_meta_token',       (o.meta_conversions_api_token IS NOT NULL AND o.meta_conversions_api_token <> '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_organization(uuid) TO authenticated;
