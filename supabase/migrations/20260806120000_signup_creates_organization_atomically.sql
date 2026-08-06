-- Makes "account exists but its organization does not" unrepresentable.
--
-- Public signup used to create the auth user and then create the organization
-- from the browser, in a second step. When Supabase requires email
-- confirmation, signUp returns no session, the frontend returned early, and the
-- organization was never created — leaving an account that could not even log
-- in (the login screen validates the company code, which did not exist). The
-- company name and code the user typed were lost with the page.
--
-- The organization is now created inside handle_new_user, in the SAME
-- transaction as the auth user: if the organization cannot be created, the
-- account is not created either.
--
-- Invited users carry no organization metadata and are attached to an existing
-- organization by accept_invite, so they are unaffected by the new branch.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_name text := NULLIF(btrim(NEW.raw_user_meta_data->>'organization_name'), '');
  _org_slug text := NULLIF(btrim(NEW.raw_user_meta_data->>'organization_slug'), '');
  _contact_phone text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'contact_phone', '')), '');
  _senvia_org_id uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380';
  _org_id uuid;
  _contact_id uuid;
  _trial_list_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilizador'),
    NEW.email
  );

  -- No company details => invite flow or an admin-created user. Nothing to do.
  IF _org_name IS NULL OR _org_slug IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _org_slug) THEN
    RAISE EXCEPTION 'Slug already exists: %', _org_slug USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.organizations (name, slug, contact_phone)
  VALUES (_org_name, _org_slug, _contact_phone)
  RETURNING id INTO _org_id;

  PERFORM set_config('app.bypass_profile_org_lock', 'true', true);
  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE id = NEW.id;

  -- Whoever creates the account is always the admin of its organization.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (NEW.id, _org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Everything below is Senvia-side marketing bookkeeping. It must never be
  -- able to abort a signup, so each part swallows its own errors.
  BEGIN
    PERFORM ensure_stripe_auto_lists(_senvia_org_id);

    INSERT INTO public.marketing_contacts (organization_id, email, name, source, subscribed)
    VALUES (_senvia_org_id, NEW.email, _org_name, 'trial', true)
    ON CONFLICT (organization_id, email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO _contact_id;

    SELECT id INTO _trial_list_id
    FROM public.client_lists
    WHERE organization_id = _senvia_org_id AND name = 'Clientes em Trial' AND is_system = true
    LIMIT 1;

    IF _trial_list_id IS NOT NULL AND _contact_id IS NOT NULL THEN
      INSERT INTO public.marketing_list_members (list_id, contact_id)
      VALUES (_trial_list_id, _contact_id)
      ON CONFLICT (list_id, contact_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.leads (organization_id, name, email, phone, status, custom_data)
    VALUES (
      _senvia_org_id, _org_name, NEW.email,
      COALESCE(_contact_phone, ''), 'new',
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
        'record', jsonb_build_object('email', NEW.email, 'nome', _org_name)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;
