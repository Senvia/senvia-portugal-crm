-- Senvia's OWN funnel in its own CRM (Senvia Agency org), so Meta CAPI can
-- optimise for PAYERS, not just signups:
--   * trial signup        -> Lead in Senvia Agency (Meta "Lead" already fires)
--   * first paid (trial->paid) -> Client + Sale (the Sale fires the existing Meta
--     CAPI Purchase trigger via lead_id, exactly like a normal client funnel).
--
-- Both steps are exception-wrapped so they can NEVER break signup or payment.

-- ---------------------------------------------------------------------------
-- 1) Signup -> Lead. Adds a lead insert to the create-org RPC (the _contact_phone
--    overload, which is the one the app calls). The lead carries the signup org
--    id in custom_data so the payment step can find it.
-- ---------------------------------------------------------------------------
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

    -- NEW: track the trial as a real lead in the Senvia Agency pipeline. Wrapped
    -- so a funnel-lead failure never blocks the signup.
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
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaG1md2xpbXRic3lqbWd0b2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjIwNTUsImV4cCI6MjA5NjIzODA1NX0.vLxYjpcZHzZhjbNkgy9tPnfK_L_jbSfoEueETgGqBgc"}'::jsonb,
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

-- ---------------------------------------------------------------------------
-- 2) First paid -> Client + Sale. On organizations.first_paid_at NULL->value,
--    convert the org's signup lead into a client + a sale in Senvia Agency. The
--    sale (lead_id + value) fires the existing trg_meta_capi_purchase -> Purchase.
--    Value = the plan's monthly price. Idempotent + exception-wrapped.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_trial_to_client_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _senvia uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380';
  _lead public.leads%ROWTYPE;
  _client_id uuid;
  _value numeric;
BEGIN
  IF NEW.id = _senvia THEN RETURN NEW; END IF;

  SELECT * INTO _lead FROM public.leads
  WHERE organization_id = _senvia
    AND custom_data->>'signup_organization_id' = NEW.id::text
  ORDER BY created_at DESC LIMIT 1;
  IF _lead.id IS NULL THEN RETURN NEW; END IF;

  -- Idempotency: already converted this lead into a sale.
  IF EXISTS (SELECT 1 FROM public.sales WHERE organization_id = _senvia AND lead_id = _lead.id) THEN
    RETURN NEW;
  END IF;

  _value := CASE NEW.plan
    WHEN 'starter' THEN 49
    WHEN 'pro' THEN 99
    WHEN 'elite' THEN 147
    ELSE 0
  END;

  -- Lead -> Client (carry lead_id, like a normal conversion).
  SELECT id INTO _client_id FROM public.crm_clients
    WHERE organization_id = _senvia AND lead_id = _lead.id LIMIT 1;
  IF _client_id IS NULL THEN
    INSERT INTO public.crm_clients (organization_id, name, email, phone, lead_id)
    VALUES (_senvia, _lead.name, _lead.email, _lead.phone, _lead.id)
    RETURNING id INTO _client_id;
  END IF;

  UPDATE public.leads SET status = 'won' WHERE id = _lead.id;

  -- The sale. Its INSERT fires trg_meta_capi_purchase (lead_id + value > 0).
  INSERT INTO public.sales (organization_id, client_id, lead_id, total_value)
  VALUES (_senvia, _client_id, _lead.id, _value);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'convert_trial_to_client_sale failed for org %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convert_trial_to_client_sale ON public.organizations;
CREATE TRIGGER trg_convert_trial_to_client_sale
  AFTER UPDATE OF first_paid_at ON public.organizations
  FOR EACH ROW
  WHEN (OLD.first_paid_at IS NULL AND NEW.first_paid_at IS NOT NULL)
  EXECUTE FUNCTION public.convert_trial_to_client_sale();
