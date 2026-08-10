-- Segundo caminho que duplicava o lead do trial.
--
-- Além do trigger handle_new_user (tratado em 20260810120000), a RPC
-- create_organization_for_current_user também inseria um lead na org SENVIA.
-- Existem DUAS sobrecargas desta função; só a de 3 argumentos tem o INSERT.
-- A de 2 argumentos (_name, _slug) não faz marketing nenhum e fica intocada.
--
-- Esta RPC é chamada pelo ecrã "completar empresa" (CompleteOrganizationSetup),
-- que hoje é raro porque o signup já cria a organização — mas quem lá passasse
-- voltava a ficar com dois leads.
--
-- Fonte única a partir daqui: a edge function notify-new-trials, que cria o
-- lead com source = 'Trial SENVIA OS' e é idempotente via
-- organizations.trial_notified_at.
--
-- Corpo copiado verbatim de pg_get_functiondef; a ÚNICA alteração é a remoção
-- do bloco do INSERT em public.leads.

CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(_name text, _slug text, _contact_phone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- O lead do trial NÃO é criado aqui — ver cabeçalho.

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
$function$;
