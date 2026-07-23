-- 20260723120000_inbox_messages_rls.sql
-- Security audit fix (Vector 4 - schema exposure): inbox_messages was created
-- in 20260630130000_inbox_messages.sql with NO RLS at all. Every row (phone
-- numbers + WhatsApp message text, for every organization) was readable and
-- writable by anyone via the PostgREST REST API, with zero tenant isolation.
-- Written only by supabase/functions/evolution-webhook (service role, bypasses
-- RLS) and never read from the frontend directly, so a SELECT-only policy for
-- org members is enough — no INSERT/UPDATE/DELETE policy is added, which
-- means those stay default-deny for anon/authenticated.

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org inbox messages"
ON public.inbox_messages
FOR SELECT
TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
