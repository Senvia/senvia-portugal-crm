-- 20260723122000_critical_rls_hardening.sql
-- Security audit fix (Vector 1 - RLS cross-tenant leaks). Two chained,
-- independently-confirmed CRITICAL findings:
--
-- (A) profiles.organization_id could be self-edited by ANY authenticated user
--     ("Users update own profile" only checked `id = auth.uid()`, no column
--     restriction), and get_user_org_id() falls back to trusting
--     profiles.organization_id as a last resort when the caller has no active
--     organization_members row. A user with no active membership (e.g. just
--     removed from an org, or never joined one) could set their own
--     profiles.organization_id to ANY org's UUID via
--       supabase.from('profiles').update({ organization_id: '<target-org>' })
--     and be treated as a full member of that org by every policy still keyed
--     on get_user_org_id() instead of is_org_member() (~35 tables: leads,
--     sales, crm_clients, expenses, products, proposals, organizations itself,
--     etc). Fixed by locking the column behind a trigger, with a transaction-
--     local bypass flag set only by the two legitimate SECURITY DEFINER paths
--     that are allowed to set it (create_organization_for_current_user,
--     accept_invite).
--
-- (B) has_role() checks a GLOBAL user_roles table, never scoped per-org, and
--     rows are inserted permanently (never deleted) whenever a user creates
--     their own org (they get a global 'admin' row for life). Multiple
--     policies gate admin-only actions on `is_org_member(...) AND
--     has_role(...,'admin')` instead of the properly org-scoped
--     `is_org_admin(...)` — meaning a user who is admin of THEIR OWN org but
--     merely a viewer/salesperson invited into a SECOND org can self-escalate
--     to admin of that second org (worst case: organization_members
--     management itself). This migration fixes the flagship case
--     (organization_members) and the organization-logos storage bucket (which
--     had no per-org path scoping at all, compounding the same bug). The
--     other ~40 occurrences of this pattern across the codebase are NOT
--     touched here — they need the same is_org_member(...) AND
--     has_role(...,'admin') -> is_org_admin(...) substitution as a dedicated
--     follow-up pass, flagged separately in the audit report.

-- =============================================================================
-- (D, moved first) internal_service_key() must be DEFINED before section (A)
-- uses it below (this file runs top-to-bottom as one transaction) — see the
-- full explanation of why this exists further down where the pg_net trigger
-- bodies are re-pointed at it.
--
-- ONE-TIME MANUAL STEP — run this yourself in the Supabase SQL Editor, with
-- your REAL service_role key from Project Settings -> API (do NOT commit the
-- real key anywhere in git):
--
--   select vault.create_secret('<paste the real service_role key here>', 'service_role_key');
--
CREATE OR REPLACE FUNCTION public.internal_service_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
$$;

-- =============================================================================
-- (A) Lock profiles.organization_id against direct client-side edits.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_org_id_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     AND current_setting('app.bypass_profile_org_lock', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'organization_id não pode ser alterado diretamente — use accept_invite() ou create_organization_for_current_user()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_org_id ON public.profiles;
CREATE TRIGGER lock_profile_org_id
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_org_id_self_edit();

-- Both existing overloads of create_organization_for_current_user must set the
-- bypass flag before their own legitimate UPDATE — the trigger above fires
-- regardless of which SECURITY DEFINER function performs the update.
CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(_name text, _slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) THEN
    RAISE EXCEPTION 'Slug already exists';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  PERFORM set_config('app.bypass_profile_org_lock', 'true', true);
  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (_user_id, _org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN _org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(_name text, _slug text, _contact_phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _user_id uuid;
  _user_email text;
  _senvia_org_id uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380';
  _contact_id uuid;
  _trial_list_id uuid;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND organization_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) THEN
    RAISE EXCEPTION 'Slug already exists';
  END IF;

  INSERT INTO public.organizations (name, slug, contact_phone)
  VALUES (_name, _slug, _contact_phone)
  RETURNING id INTO _org_id;

  PERFORM set_config('app.bypass_profile_org_lock', 'true', true);
  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (_user_id, _org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  IF _user_email IS NOT NULL THEN
    PERFORM ensure_stripe_auto_lists(_senvia_org_id);

    INSERT INTO public.marketing_contacts (organization_id, email, name, source, subscribed)
    VALUES (_senvia_org_id, _user_email, _name, 'trial', true)
    ON CONFLICT (organization_id, email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO _contact_id;

    SELECT id INTO _trial_list_id FROM public.client_lists
    WHERE organization_id = _senvia_org_id AND name = 'Clientes em Trial' AND is_system = true
    LIMIT 1;

    IF _trial_list_id IS NOT NULL AND _contact_id IS NOT NULL THEN
      INSERT INTO public.marketing_list_members (list_id, contact_id)
      VALUES (_trial_list_id, _contact_id)
      ON CONFLICT (list_id, contact_id) DO NOTHING;
    END IF;

    BEGIN
      INSERT INTO public.leads (organization_id, name, email, phone, status, custom_data)
      VALUES (
        _senvia_org_id,
        _name,
        _user_email,
        COALESCE(NULLIF(_contact_phone, ''), ''),
        'new',
        jsonb_build_object('source', 'trial_signup', 'signup_organization_id', _org_id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      PERFORM net.http_post(
        url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/process-automation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.internal_service_key()
        ),
        body := jsonb_build_object(
          'trigger_type', 'trial_started',
          'organization_id', _senvia_org_id,
          'record', jsonb_build_object('email', _user_email, 'nome', _name)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN _org_id;
END;
$$;

-- accept_invite took an arbitrary _user_id with NO check that it matched the
-- caller — a missing auth.uid() binding that would let a caller add a
-- DIFFERENT account to an org (or under a role) without that account's
-- consent, given only a valid pending invite token.
CREATE OR REPLACE FUNCTION public.accept_invite(_token uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO invite_record
  FROM public.organization_invites
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('app.bypass_profile_org_lock', 'true', true);
  UPDATE public.profiles
  SET organization_id = invite_record.organization_id
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, invite_record.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (_user_id, invite_record.organization_id, invite_record.role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = invite_record.role;

  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE id = invite_record.id;

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- (B) has_role() is global — organization_members management (and the org-logo
-- storage bucket) must gate on the per-org is_org_admin() instead.
-- =============================================================================

DROP POLICY IF EXISTS "Admins manage org members" ON public.organization_members;
CREATE POLICY "Admins manage org members"
ON public.organization_members
FOR ALL
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
CREATE POLICY "Admins can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
CREATE POLICY "Admins can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;
CREATE POLICY "Admins can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- =============================================================================
-- (C) unarchive_lead_on_whatsapp_nudge: cross-tenant write (matched by phone
-- only, no organization_id scoping) + never had search_path pinned.
-- =============================================================================

CREATE OR REPLACE FUNCTION unarchive_lead_on_whatsapp_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET archived_at = NULL
  WHERE phone = NEW.phone
    AND organization_id = NEW.organization_id
    AND archived_at IS NOT NULL;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- (D) Trigger-initiated edge function calls (pg_net) were using a hardcoded,
-- PUBLIC anon-key JWT as their "Authorization: Bearer" — fine for functions
-- that are meant to be publicly reachable, but wrong for functions that were
-- JUST given a real auth check trusting a service-role bearer as the "this is
-- a legitimate internal caller" signal (send-push-notification,
-- process-automation): the anon key is public, so treating it as a trust
-- signal would defeat those fixes entirely. internal_service_key() (defined
-- at the top of this file) reads the real service role key from Supabase
-- Vault instead of a hardcoded git-committed value.

-- Re-point the two other pg_net triggers that shared the exact same hardcoded
-- anon-key JWT at the new helper, for consistency (dispatch_meta_capi_purchase
-- calls meta-capi-purchase, which already validates its own input properly —
-- this is a hygiene fix, not closing an active hole on that one).
CREATE OR REPLACE FUNCTION public.notify_sale_concluded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_body text;
  v_title text;
  v_user_ids uuid[];
  v_titles text[] := ARRAY[
    '🔥 Bateu mais uma! 💰',
    '🚀 Mais uma venda fechada! Bora pra próxima!',
    '🎉 Fechou! Rumo à meta! 🎯',
    '💪 É disso que a gente gosta!',
    '🏆 Mais um cliente conquistado!',
    '⚡ Contrato assinado! Vamos pra cima!',
    '🤑 Dinheiro entrando! Mais uma!',
    '💥 BOOM! Mais uma no placar!',
    '🌟 Time imparável! Mais uma venda!',
    '🔥 Tá voando! Mais uma fechada!'
  ];
BEGIN
  IF (NEW.status IS DISTINCT FROM 'delivered')
     OR (OLD.status IS NOT DISTINCT FROM 'delivered') THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(DISTINCT ur.user_id)
    INTO v_user_ids
  FROM public.user_roles ur
  JOIN public.organization_members om ON om.user_id = ur.user_id
  WHERE om.organization_id = NEW.organization_id
    AND om.is_active = true
    AND ur.role IN ('admin', 'super_admin', 'salesperson');

  IF v_user_ids IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(c.name, c.company, l.name, 'Cliente')
    INTO v_client_name
  FROM (SELECT NEW.client_id AS cid, NEW.lead_id AS lid) s
  LEFT JOIN public.crm_clients c ON c.id = s.cid
  LEFT JOIN public.leads l ON l.id = s.lid;

  v_title := v_titles[1 + floor(random() * array_length(v_titles, 1))::int];
  v_body := COALESCE(v_client_name, 'Cliente')
            || ' — ' || COALESCE(NEW.total_value, 0)::numeric(12,2)::text || ' €';

  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'user_ids', to_jsonb(v_user_ids),
      'title', v_title,
      'body', v_body,
      'url', '/sales',
      'tag', 'sale-closed-' || NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.internal_service_key()
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_sale_concluded failed for sale %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_meta_capi_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NULL OR COALESCE(NEW.total_value, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/meta-capi-purchase',
    body := jsonb_build_object('sale_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.internal_service_key()
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'meta-capi-purchase dispatch failed for sale %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
