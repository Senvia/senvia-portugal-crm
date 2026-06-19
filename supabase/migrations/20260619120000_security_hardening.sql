-- Security hardening (defensive audit remediation) — 2026-06-19.
-- Addresses: cross-tenant Storage reads, two overly-permissive RLS policies
-- (WITH CHECK/USING true), and SECURITY DEFINER functions missing search_path.
-- (The org-secrets exposure is handled in a separate migration.)

-- 1) Storage: support-attachments must be readable ONLY by members of the owning
-- org. Files are uploaded under "<organization_id>/...". The old policy allowed any
-- authenticated user (of any tenant) to read every org's ticket/Otto attachments.
DROP POLICY IF EXISTS "Authenticated read support attachments" ON storage.objects;
CREATE POLICY "Members read support attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.organizations WHERE public.is_org_member(auth.uid(), id)
    )
  );

-- 2) stripe_commission_records: the INSERT policy was WITH CHECK (true) with no
-- role restriction, so any authenticated user could inject commission/financial
-- rows for ANY org. Restrict inserts to the caller's own org (super_admins may
-- still manage across orgs). Service role (stripe-webhook) bypasses RLS, unaffected.
DROP POLICY IF EXISTS "Service role can insert stripe commission records" ON public.stripe_commission_records;
CREATE POLICY "Insert own-org stripe commission records"
  ON public.stripe_commission_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 3) prospect_generation_jobs: the UPDATE policy was USING (true) WITH CHECK (true)
-- with no role restriction, allowing cross-tenant writes to job rows. Scope it to
-- the job's org. The check-prospect-job function uses the service role (bypasses RLS).
DROP POLICY IF EXISTS "Service role can update jobs" ON public.prospect_generation_jobs;
CREATE POLICY "Update own-org prospect jobs"
  ON public.prospect_generation_jobs
  FOR UPDATE
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4) Pin search_path on SECURITY DEFINER functions that omitted it, to prevent
-- search_path hijacking / privilege escalation. (Body unchanged.)
ALTER FUNCTION public.get_next_round_robin_assignee(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.get_next_webhook_assignee(uuid) SET search_path = public;
ALTER FUNCTION public.create_default_lead_intake_webhook() SET search_path = public;
ALTER FUNCTION public.get_next_form_assignee(uuid) SET search_path = public;
ALTER FUNCTION public.merge_messaging_channel_metadata_by_id(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.get_next_channel_assignee(uuid) SET search_path = public;
