-- Liga o motor de fluxos aos eventos reais do CRM.
--
-- O chatwoot-webhook (que corre com a service-role key) precisa de ler o
-- segredo para chamar o motor quando chega uma resposta. anon e authenticated
-- continuam sem acesso.
GRANT EXECUTE ON FUNCTION public.automation_internal_secret() TO service_role;

--
-- O gatilho de base de dados passa a despachar para DOIS destinos:
--   process-automation  — o sistema antigo (1 template = 1 email), que continua
--                         a funcionar enquanto houver automações por migrar;
--   automation-engine   — os fluxos novos.
-- Correm lado a lado de propósito: nenhuma automação existente deixa de
-- funcionar no dia em que isto entra.

CREATE OR REPLACE FUNCTION public.notify_automation_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _trigger_type text;
  _org_id uuid;
  _payload jsonb;
  _secret text;
  _headers jsonb;
BEGIN
  IF current_setting('app.skip_lead_side_effects', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'leads' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'lead_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'lead_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_clients' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'client_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'client_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'sales' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'sale_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'sale_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    _org_id := NEW.organization_id;
    IF TG_OP = 'INSERT' THEN
      _trigger_type := 'proposal_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _trigger_type := 'proposal_status_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  _secret := public.automation_internal_secret();
  IF _secret IS NULL OR _secret = '' THEN
    RAISE WARNING 'notify_automation_trigger: segredo em falta — % nao despachado', _trigger_type;
    RETURN NEW;
  END IF;

  _headers := jsonb_build_object('Content-Type', 'application/json', 'x-automation-secret', _secret);

  _payload := jsonb_build_object(
    'trigger_type', _trigger_type,
    'organization_id', _org_id,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Sistema antigo (templates com gatilho).
  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/process-automation',
    body := _payload,
    headers := _headers
  );

  -- Fluxos novos. subject_type diz ao motor o que atualizar em nós como
  -- "mover etapa" ou "atribuir responsável".
  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/automation-engine',
    body := _payload || jsonb_build_object(
      'action', 'enroll',
      'subject_type', CASE TG_TABLE_NAME
        WHEN 'leads'       THEN 'lead'
        WHEN 'crm_clients' THEN 'client'
        WHEN 'sales'       THEN 'sale'
        ELSE 'contact'
      END
    ),
    headers := _headers
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Automation trigger failed (%): %', _trigger_type, SQLERRM;
  RETURN NEW;
END;
$function$;

-- O tick: acorda percursos cuja espera terminou (esperas de tempo e limites de
-- resposta). A cada minuto, como o send-scheduled-messages.
SELECT cron.schedule(
  'automation-engine-tick',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/automation-engine',
    body := '{"action":"tick"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-automation-secret', public.automation_internal_secret()
    )
  );
  $job$
);
