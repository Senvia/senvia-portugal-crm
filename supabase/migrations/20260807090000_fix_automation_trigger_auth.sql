-- FASE 0 — as automações disparadas por eventos do CRM estavam mortas.
--
-- `notify_automation_trigger` chamava process-automation com a ANON key, mas
-- essa função exige a service-role key e respondia 401. Como o trigger engole
-- todos os erros (EXCEPTION WHEN OTHERS -> RAISE WARNING), nada aparecia: as
-- automações de lead_created, *_status_changed, sale_created e proposal_created
-- simplesmente nunca corriam. Havia 10 automações ativas em 3 organizações
-- nesse estado, e a fila automation_queue estava permanentemente vazia.
--
-- Segundo problema: várias funções (create_organization_for_current_user, e
-- handle_new_user desde 20260806120000) chamam `public.internal_service_key()`,
-- que NUNCA existiu neste projeto. Também estão dentro de blocos EXCEPTION, por
-- isso o disparo de `trial_started` a cada registo novo falhava em silêncio.
--
-- Solução: um segredo partilhado que vive só no Supabase Vault — nunca numa
-- variável de ambiente, nunca no git, nunca na definição do trigger. Mesmo
-- padrão já validado em produção para os crons do Stripe
-- (verify_stripe_cron_secret).

-- 1. Segredo gerado dentro da própria base de dados.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'automation_internal_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'automation_internal_secret',
      'Segredo partilhado para chamadas internas da base de dados às edge functions de automações'
    );
  END IF;
END $$;

-- 2. Leitura do segredo para quem PRECISA de o enviar (as funções SECURITY
--    DEFINER que fazem net.http_post). Revogada de todos os papéis de cliente.
CREATE OR REPLACE FUNCTION public.automation_internal_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT btrim(decrypted_secret)
  FROM vault.decrypted_secrets
  WHERE name = 'automation_internal_secret'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.automation_internal_secret() FROM public;
REVOKE ALL ON FUNCTION public.automation_internal_secret() FROM anon;
REVOKE ALL ON FUNCTION public.automation_internal_secret() FROM authenticated;

-- 3. Verificação para o lado da edge function: responde apenas "confere ou
--    não", nunca devolve o segredo.
CREATE OR REPLACE FUNCTION public.verify_automation_secret(p_secret text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'automation_internal_secret'
      AND btrim(decrypted_secret) = p_secret
  );
$$;

REVOKE ALL ON FUNCTION public.verify_automation_secret(text) FROM public;
REVOKE ALL ON FUNCTION public.verify_automation_secret(text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_automation_secret(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_automation_secret(text) TO service_role;

-- 4. Compatibilidade: o nome `internal_service_key` é chamado por funções já
--    existentes (create_organization_for_current_user, handle_new_user). Passa
--    a existir e a devolver o mesmo segredo, para esses disparos voltarem a
--    funcionar sem ter de reescrever cada uma.
CREATE OR REPLACE FUNCTION public.internal_service_key()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.automation_internal_secret();
$$;

REVOKE ALL ON FUNCTION public.internal_service_key() FROM public;
REVOKE ALL ON FUNCTION public.internal_service_key() FROM anon;
REVOKE ALL ON FUNCTION public.internal_service_key() FROM authenticated;

-- 5. O trigger passa a enviar o segredo no header x-automation-secret. A lógica
--    de decisão fica exatamente como estava — só muda a autenticação e o facto
--    de uma falha de envio passar a ser visível no log.
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
BEGIN
  -- Importação em massa: sem automações (importação silenciosa).
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

  _payload := jsonb_build_object(
    'trigger_type', _trigger_type,
    'organization_id', _org_id,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  _secret := public.automation_internal_secret();
  IF _secret IS NULL OR _secret = '' THEN
    -- Sem segredo o pedido seria rejeitado com 401 sem deixar rasto. Melhor
    -- gritar no log do que repetir o modo de falha silenciosa que motivou esta
    -- migração.
    RAISE WARNING 'notify_automation_trigger: automation_internal_secret em falta — % nao foi despachado', _trigger_type;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/process-automation',
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-automation-secret', _secret
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Automation trigger failed (%): %', _trigger_type, SQLERRM;
  RETURN NEW;
END;
$function$;
