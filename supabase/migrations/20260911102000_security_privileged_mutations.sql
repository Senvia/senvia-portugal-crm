BEGIN;

CREATE OR REPLACE FUNCTION public.merge_messaging_channel_metadata(p_org_id uuid, p_channel_type text, p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_org_admin(auth.uid(), p_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.messaging_channels SET metadata = coalesce(metadata, '{}'::jsonb) || p_patch
    WHERE organization_id = p_org_id AND channel_type = p_channel_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_messaging_channel_metadata_by_id(p_channel_id uuid, p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.messaging_channels WHERE id = p_channel_id;
  IF NOT public.is_org_admin(auth.uid(), v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.messaging_channels SET metadata = coalesce(metadata, '{}'::jsonb) || p_patch,
    updated_at = now() WHERE id = p_channel_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_sale_seller_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_org_admin(auth.uid(), NEW.organization_id) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.seller_id, NEW.created_by) IS DISTINCT FROM NEW.created_by THEN
      RAISE EXCEPTION 'Só administradores podem atribuir uma venda a outro vendedor';
    END IF;
  ELSIF coalesce(NEW.seller_id, NEW.created_by) IS DISTINCT FROM coalesce(OLD.seller_id, OLD.created_by) THEN
    RAISE EXCEPTION 'Só administradores podem atribuir uma venda a outro vendedor';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_messaging_channel_metadata(uuid,text,jsonb),
  public.merge_messaging_channel_metadata_by_id(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_messaging_channel_metadata(uuid,text,jsonb),
  public.merge_messaging_channel_metadata_by_id(uuid,jsonb) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.automation_queue FROM anon, authenticated;

DROP POLICY IF EXISTS email_commands_insert ON public.email_commands;
CREATE POLICY email_commands_insert ON public.email_commands FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND public.pode_aceder_caixa(auth.uid(), channel_id)
  AND EXISTS (SELECT 1 FROM public.messaging_channels c
    WHERE c.id = email_commands.channel_id AND c.organization_id = email_commands.organization_id)
);

DO $$
DECLARE tbl text; action text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['organizations','organization_members','organization_profiles','user_roles','profiles'] LOOP
    FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
        'security_mfa_' || lower(action), tbl, action,
        CASE action WHEN 'INSERT' THEN 'WITH CHECK (public.meets_mfa_policy(auth.uid()))'
          WHEN 'DELETE' THEN 'USING (public.meets_mfa_policy(auth.uid()))'
          ELSE 'USING (public.meets_mfa_policy(auth.uid())) WITH CHECK (public.meets_mfa_policy(auth.uid()))' END);
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;
