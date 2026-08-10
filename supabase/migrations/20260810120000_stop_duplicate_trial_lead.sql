-- Leads duplicados a cada registo de trial.
--
-- Dois caminhos criavam um lead na org SENVIA por cada conta nova:
--   1. handle_new_user (este trigger, desde 2026-08-06) - custom_data.source =
--      trial_signup, coluna source vazia, automacoes LIGADAS.
--   2. edge function notify-new-trials (cron) - source = Trial SENVIA OS,
--      temperatura hot, automacoes desligadas, com responsavel/empresa/notas.
--
-- O segundo e o que a equipa comercial usa, e ja e idempotente atraves de
-- organizations.trial_notified_at. Este remove o primeiro.
--
-- Nada mais do signup e alterado: perfil, organizacao, roles, membros, listas
-- de marketing e o disparo da automacao continuam iguais.

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

  -- O lead do trial NAO e criado aqui. Quem o cria e a edge function
  -- notify-new-trials, que corre por cron e e idempotente via
  -- organizations.trial_notified_at. Ter os dois caminhos fazia cair DOIS leads
  -- por cada registo: um daqui (custom_data.source = trial_signup, sem valor na
  -- coluna source e com automacoes ligadas) e outro do cron
  -- (source = Trial SENVIA OS, temperatura hot, automacoes desligadas).
  -- O do cron e o que a equipa quer: tem responsavel, empresa e notas.

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
