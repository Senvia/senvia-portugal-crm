-- Telecom sale lifecycle: BDS-style statuses, scheduled installs, card-count
-- rollups, per-client document checklist, and automatic chargeback staging.
--
-- 1. sales.telecom_status — the 5 states a telecom sale actually moves
--    through, kept SEPARATE from the generic sales.status (which every other
--    vertical shares and which drives existing filters/pipelines). The two
--    cancellation states differ by money: 'anulado' is cancelled BEFORE
--    install and costs nothing, 'cancelado' is cancelled AFTER install and
--    claws the commission back (a chargeback).
-- 2. sales.scheduled_install_date — when the install is booked for. Always
--    optional: a sale can be closed before a date is agreed, and those show
--    up as "sem data" in the dashboard instead of being forced into a month.
-- 3. sales.total_cartoes / crm_clients.total_cartoes — how many units (SIM
--    cards / lines) a sale carries, and the running total per client. The
--    per-line quantity already lives in servicos_details; these just roll it
--    up so it can be listed, filtered and reported without parsing JSON.
-- 4. crm_clients.documents_checked + organizations.client_document_types —
--    a per-org list of document types (CTR, ...) and which ones each client
--    has handed in.
-- 5. sale_chargebacks — when a sale is marked 'cancelado', the commission
--    already earned on it is staged for clawback, one row per beneficiary.
--    Deliberately its own table rather than a row in commission_chargeback_
--    items: that one models an imported operator spreadsheet (import batch,
--    CPE, row index, match confidence) and none of that applies here. The
--    operator's real file still arrives later and reconciles against these.

-- ============================================================
-- 1. sales: telecom status, scheduled install, card count
-- ============================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS telecom_status         text,
  ADD COLUMN IF NOT EXISTS scheduled_install_date date,
  ADD COLUMN IF NOT EXISTS total_cartoes          numeric NOT NULL DEFAULT 0;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_telecom_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_telecom_status_check
  CHECK (telecom_status IS NULL OR telecom_status IN
    ('pendente', 'em_instalacao', 'ativo', 'anulado', 'cancelado'));

COMMENT ON COLUMN public.sales.telecom_status IS
  'Telecom-only lifecycle, independent of sales.status. pendente | em_instalacao | ativo (instalado) | anulado (cancelado antes da instalação, sem chargeback) | cancelado (cancelado após a instalação, gera chargeback). NULL for non-telecom orgs.';
COMMENT ON COLUMN public.sales.scheduled_install_date IS
  'Booked install date. Optional by design — sales with no date are reported separately ("sem data") instead of being counted into a month.';
COMMENT ON COLUMN public.sales.total_cartoes IS
  'Units (cards/lines) on this sale: the sum of every quantidade in servicos_details. Maintained by compute_sale_total_cartoes().';

CREATE INDEX IF NOT EXISTS sales_telecom_status_idx
  ON public.sales (organization_id, telecom_status);
CREATE INDEX IF NOT EXISTS sales_scheduled_install_idx
  ON public.sales (organization_id, scheduled_install_date);

-- ============================================================
-- 2. crm_clients: card rollup + document checklist
-- ============================================================
ALTER TABLE public.crm_clients
  ADD COLUMN IF NOT EXISTS total_cartoes     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_checked text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.crm_clients.total_cartoes IS
  'Units (cards/lines) across ALL this client''s sales, every status. Maintained by update_client_sales_metrics().';
COMMENT ON COLUMN public.crm_clients.documents_checked IS
  'Keys of the document types this client has handed in, from organizations.client_document_types (e.g. {ctr}).';

-- ============================================================
-- 3. organizations: which document types exist for this org
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS client_document_types jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.organizations.client_document_types IS
  'Document checklist available on every client of this org: [{"key":"ctr","label":"CTR"}]. Keys are what crm_clients.documents_checked stores.';

-- ============================================================
-- 4. sales.total_cartoes: sum the per-line quantities
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_sale_total_cartoes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only quantity-tiered products carry 'quantidade'; everything else simply
  -- contributes nothing rather than counting as 1, so the number means
  -- "cards/lines sold", not "products on the sale".
  NEW.total_cartoes := COALESCE((
    SELECT SUM(COALESCE(public._safe_numeric(entry.value->>'quantidade'), 0))
    FROM jsonb_each(
      CASE WHEN jsonb_typeof(NEW.servicos_details) = 'object'
           THEN NEW.servicos_details ELSE '{}'::jsonb END
    ) AS entry
  ), 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_total_cartoes_trg ON public.sales;
CREATE TRIGGER sales_total_cartoes_trg
  BEFORE INSERT OR UPDATE OF servicos_details ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_sale_total_cartoes();

-- ============================================================
-- 5. crm_clients rollup: same function as before, plus total_cartoes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_client_sales_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE crm_clients SET
      total_sales = (SELECT COUNT(*) FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      total_value = (SELECT COALESCE(SUM(total_value), 0) FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      total_comissao = (SELECT COALESCE(SUM(comissao), 0) FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      total_mwh = (SELECT COALESCE(SUM(consumo_anual), 0) / 1000.0 FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      total_kwp = (SELECT COALESCE(SUM(kwp), 0) FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      total_cartoes = (SELECT COALESCE(SUM(total_cartoes), 0) FROM sales WHERE client_id = NEW.client_id AND organization_id = NEW.organization_id),
      updated_at = now()
    WHERE id = NEW.client_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE crm_clients SET
      total_sales = (SELECT COUNT(*) FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_value = (SELECT COALESCE(SUM(total_value), 0) FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_comissao = (SELECT COALESCE(SUM(comissao), 0) FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_mwh = (SELECT COALESCE(SUM(consumo_anual), 0) / 1000.0 FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_kwp = (SELECT COALESCE(SUM(kwp), 0) FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_cartoes = (SELECT COALESCE(SUM(total_cartoes), 0) FROM sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      updated_at = now()
    WHERE id = OLD.client_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- ============================================================
-- 6. sale_chargebacks: commission staged for clawback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_chargebacks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id         uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  -- Who earned the commission being clawed back (one row per beneficiary,
  -- since a sale can pay several people — see sale_commission_splits).
  user_id         uuid NOT NULL,
  amount          numeric NOT NULL DEFAULT 0,
  reason          text NOT NULL DEFAULT 'telecom_status_cancelado',
  -- pending: staged automatically, operator's file hasn't arrived yet.
  -- reconciled: confirmed against the operator's imported chargeback.
  -- dismissed: an admin decided it doesn't apply after all.
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reconciled', 'dismissed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sale_chargebacks_sale_user_unique UNIQUE (sale_id, user_id)
);

COMMENT ON TABLE public.sale_chargebacks IS
  'Commission staged for clawback when a telecom sale is cancelled AFTER install (sales.telecom_status = ''cancelado''). One row per beneficiary. Separate from commission_chargeback_items, which models rows imported from an operator spreadsheet and matched by CPE.';

CREATE INDEX IF NOT EXISTS sale_chargebacks_org_status_idx
  ON public.sale_chargebacks (organization_id, status);
CREATE INDEX IF NOT EXISTS sale_chargebacks_user_idx
  ON public.sale_chargebacks (organization_id, user_id);

CREATE TRIGGER trg_sale_chargebacks_updated_at
  BEFORE UPDATE ON public.sale_chargebacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sale_chargebacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view org chargebacks" ON public.sale_chargebacks;
CREATE POLICY "Members view org chargebacks"
  ON public.sale_chargebacks FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins manage org chargebacks" ON public.sale_chargebacks;
CREATE POLICY "Admins manage org chargebacks"
  ON public.sale_chargebacks FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Super admin full access chargebacks" ON public.sale_chargebacks;
CREATE POLICY "Super admin full access chargebacks"
  ON public.sale_chargebacks FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 7. Stage/unstage chargebacks as telecom_status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_sale_chargebacks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.telecom_status = 'cancelado' THEN
    -- One row per beneficiary, carrying everything that person earned on this
    -- sale. ON CONFLICT keeps a row that was already reconciled/dismissed
    -- untouched rather than resurrecting it as pending.
    INSERT INTO public.sale_chargebacks (organization_id, sale_id, user_id, amount)
    SELECT NEW.organization_id, NEW.id, s.user_id, COALESCE(SUM(s.amount), 0)
    FROM public.sale_commission_splits s
    WHERE s.sale_id = NEW.id
    GROUP BY s.user_id
    HAVING COALESCE(SUM(s.amount), 0) <> 0
    ON CONFLICT (sale_id, user_id) DO UPDATE
      SET amount = EXCLUDED.amount, updated_at = now()
      WHERE sale_chargebacks.status = 'pending';

  ELSIF OLD.telecom_status = 'cancelado' THEN
    -- Un-cancelled: drop what was only ever a projection. Anything already
    -- reconciled against the operator's file stays — that money really moved.
    DELETE FROM public.sale_chargebacks
    WHERE sale_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sale_chargebacks_trg ON public.sales;
CREATE TRIGGER sync_sale_chargebacks_trg
  AFTER UPDATE OF telecom_status ON public.sales
  FOR EACH ROW
  WHEN (NEW.telecom_status IS DISTINCT FROM OLD.telecom_status)
  EXECUTE FUNCTION public.sync_sale_chargebacks();

COMMENT ON FUNCTION public.sync_sale_chargebacks() IS
  'Stages one sale_chargebacks row per commission beneficiary when a sale is marked cancelado (cancelled after install), and removes the still-pending ones if that status is reverted.';

-- ============================================================
-- 8. Backfill the new rollups from existing data
-- ============================================================
UPDATE public.sales SET total_cartoes = COALESCE((
  SELECT SUM(COALESCE(public._safe_numeric(entry.value->>'quantidade'), 0))
  FROM jsonb_each(
    CASE WHEN jsonb_typeof(servicos_details) = 'object'
         THEN servicos_details ELSE '{}'::jsonb END
  ) AS entry
), 0)
WHERE jsonb_typeof(servicos_details) = 'object';

UPDATE public.crm_clients c SET total_cartoes = COALESCE((
  SELECT SUM(s.total_cartoes) FROM public.sales s
  WHERE s.client_id = c.id AND s.organization_id = c.organization_id
), 0);
