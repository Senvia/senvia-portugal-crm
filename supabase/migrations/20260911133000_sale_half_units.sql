BEGIN;

ALTER TABLE public.proposal_products
  ALTER COLUMN quantity TYPE numeric(12, 2) USING quantity::numeric;
ALTER TABLE public.sale_items
  ALTER COLUMN quantity TYPE numeric(12, 2) USING quantity::numeric;

ALTER TABLE public.proposal_products
  DROP CONSTRAINT IF EXISTS proposal_products_quantity_positive;
ALTER TABLE public.proposal_products
  ADD CONSTRAINT proposal_products_quantity_positive CHECK (quantity > 0);
ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_quantity_positive;
ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS operational_units numeric(12, 2) NOT NULL DEFAULT 1;
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_operational_units_positive;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_operational_units_positive CHECK (operational_units > 0);

COMMENT ON COLUMN public.sales.operational_units IS
  'Real quantity used by sales, finance, dashboards and operational reports. Fractional values remain fractional; commission calculations use their own whole-unit normalization.';

CREATE OR REPLACE FUNCTION public.sale_operational_units_from_details(p_details jsonb)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(NULLIF(SUM(
    CASE
      WHEN public._safe_numeric(entry.value->>'quantidade') > 0
        THEN public._safe_numeric(entry.value->>'quantidade')
      ELSE 0
    END
  ), 0), 1)
  FROM jsonb_each(
    CASE WHEN jsonb_typeof(p_details) = 'object' THEN p_details ELSE '{}'::jsonb END
  ) AS entry;
$$;

CREATE OR REPLACE FUNCTION public.compute_sale_operational_units()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.operational_units := public.sale_operational_units_from_details(NEW.servicos_details);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_operational_units_trg ON public.sales;
CREATE TRIGGER sales_operational_units_trg
  BEFORE INSERT OR UPDATE OF servicos_details ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_sale_operational_units();

CREATE OR REPLACE FUNCTION public.refresh_sale_operational_units_from_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id uuid;
BEGIN
  v_sale_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.sale_id ELSE NEW.sale_id END;

  UPDATE public.sales s
  SET operational_units = COALESCE(
    NULLIF((SELECT SUM(si.quantity) FROM public.sale_items si WHERE si.sale_id = v_sale_id), 0),
    public.sale_operational_units_from_details(s.servicos_details)
  )
  WHERE s.id = v_sale_id;

  IF TG_OP = 'UPDATE' AND OLD.sale_id IS DISTINCT FROM NEW.sale_id THEN
    UPDATE public.sales s
    SET operational_units = COALESCE(
      NULLIF((SELECT SUM(si.quantity) FROM public.sale_items si WHERE si.sale_id = OLD.sale_id), 0),
      public.sale_operational_units_from_details(s.servicos_details)
    )
    WHERE s.id = OLD.sale_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sale_items_operational_units_trg ON public.sale_items;
CREATE TRIGGER sale_items_operational_units_trg
  AFTER INSERT OR UPDATE OF quantity, sale_id OR DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_sale_operational_units_from_items();

UPDATE public.sales s
SET operational_units = COALESCE(
  NULLIF((SELECT SUM(si.quantity) FROM public.sale_items si WHERE si.sale_id = s.id), 0),
  public.sale_operational_units_from_details(s.servicos_details)
);

ALTER TABLE public.crm_clients
  ALTER COLUMN total_sales DROP DEFAULT,
  ALTER COLUMN total_sales TYPE numeric(12, 2) USING total_sales::numeric,
  ALTER COLUMN total_sales SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_client_sales_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_organization_id uuid;
BEGIN
  v_client_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.client_id ELSE NEW.client_id END;
  v_organization_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.crm_clients SET
      total_sales = (SELECT COALESCE(SUM(operational_units), 0) FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      total_value = (SELECT COALESCE(SUM(total_value), 0) FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      total_comissao = (SELECT COALESCE(SUM(comissao), 0) FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      total_mwh = (SELECT COALESCE(SUM(consumo_anual), 0) / 1000.0 FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      total_kwp = (SELECT COALESCE(SUM(kwp), 0) FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      total_cartoes = (SELECT COALESCE(SUM(total_cartoes), 0) FROM public.sales WHERE client_id = v_client_id AND organization_id = v_organization_id),
      updated_at = now()
    WHERE id = v_client_id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (OLD.client_id, OLD.organization_id) IS DISTINCT FROM (NEW.client_id, NEW.organization_id)
     AND OLD.client_id IS NOT NULL THEN
    UPDATE public.crm_clients SET
      total_sales = (SELECT COALESCE(SUM(operational_units), 0) FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_value = (SELECT COALESCE(SUM(total_value), 0) FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_comissao = (SELECT COALESCE(SUM(comissao), 0) FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_mwh = (SELECT COALESCE(SUM(consumo_anual), 0) / 1000.0 FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_kwp = (SELECT COALESCE(SUM(kwp), 0) FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      total_cartoes = (SELECT COALESCE(SUM(total_cartoes), 0) FROM public.sales WHERE client_id = OLD.client_id AND organization_id = OLD.organization_id),
      updated_at = now()
    WHERE id = OLD.client_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

UPDATE public.crm_clients c
SET total_sales = COALESCE((
  SELECT SUM(s.operational_units)
  FROM public.sales s
  WHERE s.client_id = c.id AND s.organization_id = c.organization_id
), 0);

-- Card totals remain operational. The commission tier is selected with a
-- whole unit, but the number of cards contributed by the sale keeps 0.5.
CREATE OR REPLACE FUNCTION public.compute_sale_total_cartoes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _catalog jsonb;
BEGIN
  SELECT servicos_products_config::jsonb INTO _catalog
  FROM public.organizations WHERE id = NEW.organization_id;

  NEW.total_cartoes := COALESCE((
    SELECT SUM(
      CASE
        WHEN entry.value ? 'total_cards' THEN
          COALESCE(public._safe_numeric(entry.value->>'total_cards'), 0)
        WHEN entry.value ? 'quantidade' THEN
          GREATEST(0.5, COALESCE(public._safe_numeric(entry.value->>'quantidade'), 1))
            * COALESCE((
                SELECT COALESCE(
                  (SELECT public._safe_numeric(t.entry->>'included_cards')
                   FROM jsonb_array_elements(COALESCE(c.entry->'quantity_tiers', '[]'::jsonb)) AS t(entry)
                   WHERE COALESCE((c.entry->>'tiered_commission')::boolean, true)
                     AND CEIL(GREATEST(0.5, COALESCE(public._safe_numeric(entry.value->>'quantidade'), 1)))
                           >= COALESCE(public._safe_numeric(t.entry->>'min'), 1)
                     AND (NULLIF(t.entry->>'max', '') IS NULL
                          OR CEIL(GREATEST(0.5, COALESCE(public._safe_numeric(entry.value->>'quantidade'), 1)))
                               <= public._safe_numeric(t.entry->>'max'))
                     AND t.entry ? 'included_cards'
                   LIMIT 1),
                  public._safe_numeric(c.entry->>'included_cards'))
                FROM jsonb_array_elements(COALESCE(_catalog, '[]'::jsonb)) AS c(entry)
                WHERE c.entry->>'name' = entry.key
                LIMIT 1
              ), 1)
            + COALESCE(public._safe_numeric(entry.value->>'extra_cards_portability'), 0)
            + COALESCE(public._safe_numeric(entry.value->>'extra_cards_new'), 0)
        ELSE
          COALESCE((
            SELECT public._safe_numeric(c.entry->>'included_cards')
            FROM jsonb_array_elements(COALESCE(_catalog, '[]'::jsonb)) AS c(entry)
            WHERE c.entry->>'name' = entry.key
            LIMIT 1
          ), 0)
            + COALESCE(public._safe_numeric(entry.value->>'extra_cards_portability'), 0)
            + COALESCE(public._safe_numeric(entry.value->>'extra_cards_new'), 0)
      END
    )
    FROM jsonb_each(
      CASE WHEN jsonb_typeof(NEW.servicos_details) = 'object'
           THEN NEW.servicos_details ELSE '{}'::jsonb END
    ) AS entry
  ), 0);
  RETURN NEW;
END;
$$;

UPDATE public.sales
SET servicos_details = servicos_details
WHERE servicos_details IS NOT NULL;

DROP VIEW IF EXISTS public.trial_activation_counts;
CREATE VIEW public.trial_activation_counts
WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name,
  floor(extract(epoch FROM (now() - o.created_at)) / 86400.0)::int AS days_since_registration,
  COALESCE(leads.cnt, 0) AS total_leads,
  COALESCE(clients.cnt, 0) AS total_clients,
  COALESCE(sales.units, 0) AS total_sales,
  COALESCE(proposals.cnt, 0) AS total_proposals,
  COALESCE(cardinality(oos.stages_completed), 0) AS onboarding_module_count,
  (SELECT count(*)::int
   FROM jsonb_each(o.trial_reminders_sent) AS reminder(key, value)
   WHERE reminder.value = 'true'::jsonb) AS trial_reminders_sent,
  o.last_active_at
FROM public.organizations o
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.leads l WHERE l.organization_id = o.id
) leads ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.crm_clients c WHERE c.organization_id = o.id
) clients ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(s.operational_units), 0) AS units
  FROM public.sales s WHERE s.organization_id = o.id
) sales ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM public.proposals p WHERE p.organization_id = o.id
) proposals ON true
LEFT JOIN public.org_onboarding_state oos ON oos.organization_id = o.id;

NOTIFY pgrst, 'reload schema';

COMMIT;
