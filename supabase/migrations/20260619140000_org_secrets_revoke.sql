-- C5 / Part B (the actual protection — run LAST, ONLY AFTER the new frontend that
-- uses get_active_organization() is deployed and validated). Running this before
-- the frontend is updated will break any page that does
-- `from('organizations').select('*' | secret_column)`.
--
-- Revokes read access to the secret columns from end-user roles. Edge functions use
-- the service role (bypasses this) and get_active_organization() is SECURITY DEFINER
-- (still reads them to compute flags). Writing the secrets (settings save = UPDATE)
-- is unaffected — UPDATE is a separate privilege from SELECT, so they become
-- effectively write-only for members.

REVOKE SELECT (
  brevo_api_key,
  invoicexpress_api_key,
  whatsapp_api_key,
  keyinvoice_password,
  keyinvoice_token,
  keyinvoice_sid,
  chatwoot_account_token,
  chatwoot_webhook_secret,
  meta_conversions_api_token
) ON public.organizations FROM authenticated, anon;
