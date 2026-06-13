-- BUG #7 — atomic merge of messaging_channels.metadata.
--
-- useSaveAutoReplyConfig and useSaveAiTasksEnabled both did SELECT-then-UPDATE
-- of the WHOLE metadata object. Two concurrent saves (or a save racing the
-- channel's own Evolution/Chatwoot config writes) clobber each other. This RPC
-- merges a JSON patch atomically: metadata = metadata || patch.
--
-- Admin-gated to match the existing "Admins manage org messaging channels"
-- policy (SECURITY DEFINER bypasses RLS, so the check is enforced here).
CREATE OR REPLACE FUNCTION public.merge_messaging_channel_metadata(
  p_org_id uuid,
  p_channel_type text,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_org_member(auth.uid(), p_org_id) AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar esta opção.';
  END IF;

  UPDATE public.messaging_channels
    SET metadata = COALESCE(metadata, '{}'::jsonb) || p_patch
    WHERE organization_id = p_org_id AND channel_type = p_channel_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_messaging_channel_metadata(uuid, text, jsonb) TO authenticated;

-- QUALITY #19 — messaging_channels used get_user_org_id (returns the user's
-- single/active org) instead of the project-standard is_org_member, which is
-- wrong for multi-org users. Realign the SELECT/management policies.
DROP POLICY IF EXISTS "Users view org messaging channels" ON public.messaging_channels;
CREATE POLICY "Users view org messaging channels"
  ON public.messaging_channels FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins manage org messaging channels" ON public.messaging_channels;
CREATE POLICY "Admins manage org messaging channels"
  ON public.messaging_channels FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::app_role));
