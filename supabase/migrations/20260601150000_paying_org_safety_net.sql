-- Rede de segurança na base de dados: ninguém apaga em massa dados de um
-- pagador. Os dois mecanismos abaixo são independentes do código de
-- aplicação — funcionam mesmo que alguém modifique uma edge function ou
-- corra um DELETE à mão no SQL Editor.
--
-- Modelo:
--   * Pagador  = organizations.first_paid_at IS NOT NULL
--   * Override = current_setting('app.allow_payer_data_delete', true) = 'on'
--     (uma operação consciente tem de definir esta flag por transação;
--      o cron e queries acidentais NÃO a têm e são bloqueados)

-- ============================================================
-- 1. Proteção contra DELETE da própria org
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_paying_org_deletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.first_paid_at IS NOT NULL
     AND COALESCE(current_setting('app.allow_payer_data_delete', true), '') <> 'on' THEN
    RAISE EXCEPTION
      'Recusado apagar organização pagadora "%" (id=%, primeiro pagamento %). Se intencional, faz "SET LOCAL app.allow_payer_data_delete = ''on''" antes do DELETE.',
      OLD.name, OLD.id, OLD.first_paid_at;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_paying_org_deletion ON public.organizations;
CREATE TRIGGER protect_paying_org_deletion
  BEFORE DELETE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_paying_org_deletion();

-- ============================================================
-- 2. Proteção contra DELETE massivo em dados de pagadores
-- ============================================================
-- A trigger é AFTER STATEMENT e usa transition tables para contar quantas
-- linhas seriam apagadas, agrupadas por organização. Se alguma org pagadora
-- ficaria com mais de 50 linhas apagadas numa mesma instrução → recusa
-- (RAISE faz rollback do statement inteiro).
--
-- Limite 50: o suficiente para permitir operações normais (apagar uns
-- contactos, várias propostas duplicadas, etc.) e bloquear o "delete all"
-- que o cleanup faz, ou um DELETE sem WHERE de um acidente.
CREATE OR REPLACE FUNCTION public.protect_paying_org_data()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_name   text;
  v_org_id     uuid;
  v_rows       integer;
  v_table_name text := TG_TABLE_NAME;
BEGIN
  -- Override explícito para operações intencionais (set local na transação)
  IF COALESCE(current_setting('app.allow_payer_data_delete', true), '') = 'on' THEN
    RETURN NULL;
  END IF;

  -- Procura a 1ª organização pagadora afetada com mais de 50 linhas neste statement
  SELECT o.id, o.name, cnt
  INTO v_org_id, v_org_name, v_rows
  FROM (
    SELECT organization_id, COUNT(*) AS cnt
    FROM old_table
    GROUP BY organization_id
  ) g
  JOIN public.organizations o ON o.id = g.organization_id
  WHERE o.first_paid_at IS NOT NULL
    AND g.cnt > 50
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Recusado apagar % linhas de % na organização pagadora "%" (id=%). Se intencional, faz "SET LOCAL app.allow_payer_data_delete = ''on''" antes do DELETE.',
      v_rows, v_table_name, v_org_name, v_org_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Aplica a proteção às tabelas principais (todas têm organization_id).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leads',
    'crm_clients',
    'proposals',
    'sales',
    'organization_members',
    'calendar_events',
    'expenses',
    'invoices',
    'forms',
    'email_campaigns',
    'email_templates',
    'bank_accounts'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS protect_paying_org_data ON public.%I',
      t
    );
    EXECUTE format($f$
      CREATE TRIGGER protect_paying_org_data
        AFTER DELETE ON public.%I
        REFERENCING OLD TABLE AS old_table
        FOR EACH STATEMENT
        EXECUTE FUNCTION public.protect_paying_org_data()
    $f$, t);
  END LOOP;
END;
$$;
