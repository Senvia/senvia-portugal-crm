-- Commission splits: one sale pays several people.
--
-- Until now a sale had a single commission (sales.comissao) belonging to a
-- single person, resolved as client.assigned_to → lead.assigned_to →
-- sales.created_by. Telecom orgs need a sale of one catalog product to pay
-- several people at once (e.g. Sara 70€, backoffice 50€, whoever sold it 30€).
--
-- Design:
--   * The RULES live in the org catalog (organizations.servicos_products_config),
--     as a "splits" array on each product.
--   * The AMOUNTS are materialised here, one row per beneficiary per sale, and
--     frozen. Editing the catalog later must never rewrite past commissions.
--   * sales.comissao keeps working as the total (the sum of the splits), so
--     every screen that reads it today is unaffected.
--
-- A split line is either:
--   {"kind":"user",    "user_id":"…",    "type":"fixed"|"pct", "value":n}
--   {"kind":"profile", "profile_id":"…", "type":"fixed"|"pct", "value":n}
--
-- A "profile" line pays ONE person: the seller of the sale, and only if the
-- seller actually holds that profile. It is the way to say "whoever sells this
-- earns 30€" without naming anyone.
--
-- Percentages are over the sale total (sales.total_value).

-- ============================================================
-- 1. Ledger table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_commission_splits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id         uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  product_name    text,
  source          text NOT NULL CHECK (source IN ('user', 'profile')),
  source_ref      uuid,
  basis           text NOT NULL CHECK (basis IN ('fixed', 'pct')),
  rate            numeric NOT NULL DEFAULT 0,
  amount          numeric NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sale_commission_splits IS
  'Frozen per-beneficiary commission for a sale. Generated from the org catalog at sale time; never recomputed from a later catalog.';
COMMENT ON COLUMN public.sale_commission_splits.source IS
  '"user" = named beneficiary. "profile" = the seller, matched against source_ref.';
COMMENT ON COLUMN public.sale_commission_splits.rate IS
  'Euros when basis = fixed, percent of sales.total_value when basis = pct.';

CREATE INDEX IF NOT EXISTS sale_commission_splits_org_user_idx
  ON public.sale_commission_splits (organization_id, user_id);
CREATE INDEX IF NOT EXISTS sale_commission_splits_sale_idx
  ON public.sale_commission_splits (sale_id);

-- ============================================================
-- 2. RLS
-- ============================================================
-- Reads match what org members can already see: sales.comissao is readable by
-- any member today, and the UI is what limits non-admins to their own numbers.
-- Writes belong to the generator function only (SECURITY DEFINER), so there is
-- deliberately no INSERT/UPDATE/DELETE policy.
ALTER TABLE public.sale_commission_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view org commission splits" ON public.sale_commission_splits;
CREATE POLICY "Members view org commission splits"
  ON public.sale_commission_splits FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 3. Generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_sale_commission_splits(p_sale_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id      uuid;
  _created_by  uuid;
  _total       numeric;
  _produtos    text[];
  _catalog     jsonb;
  _produto     text;
  _cat_entry   jsonb;
  _split       jsonb;
  _kind        text;
  _type        text;
  _value       numeric;
  _user_id     uuid;
  _profile_id  uuid;
  _amount      numeric;
  _sum         numeric := 0;
  _any_rule    boolean := false;
BEGIN
  SELECT organization_id, created_by, COALESCE(total_value, 0), servicos_produtos
    INTO _org_id, _created_by, _total, _produtos
  FROM public.sales WHERE id = p_sale_id;

  IF _org_id IS NULL THEN RETURN NULL; END IF;

  -- Regenerate from scratch: this runs while the sale is still being edited.
  DELETE FROM public.sale_commission_splits WHERE sale_id = p_sale_id;

  IF _produtos IS NULL OR array_length(_produtos, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT servicos_products_config::jsonb INTO _catalog
  FROM public.organizations WHERE id = _org_id;

  IF _catalog IS NULL OR jsonb_typeof(_catalog) <> 'array' THEN
    RETURN NULL;
  END IF;

  FOREACH _produto IN ARRAY _produtos LOOP
    _cat_entry := NULL;
    SELECT c.entry INTO _cat_entry
    FROM jsonb_array_elements(_catalog) AS c(entry)
    WHERE c.entry->>'name' = _produto
    LIMIT 1;

    CONTINUE WHEN _cat_entry IS NULL
                  OR jsonb_typeof(_cat_entry->'splits') <> 'array';

    FOR _split IN SELECT s.entry FROM jsonb_array_elements(_cat_entry->'splits') AS s(entry) LOOP
      _any_rule := true;

      _kind  := COALESCE(_split->>'kind', 'user');
      _type  := COALESCE(_split->>'type', 'fixed');
      _value := COALESCE((_split->>'value')::numeric, 0);

      _user_id    := NULL;
      _profile_id := NULL;

      IF _kind = 'user' THEN
        _user_id := NULLIF(_split->>'user_id', '')::uuid;
      ELSIF _kind = 'profile' THEN
        _profile_id := NULLIF(_split->>'profile_id', '')::uuid;
        -- Pays the seller, and only when the seller holds that profile.
        IF _profile_id IS NOT NULL AND _created_by IS NOT NULL THEN
          SELECT m.user_id INTO _user_id
          FROM public.organization_members m
          WHERE m.organization_id = _org_id
            AND m.user_id = _created_by
            AND m.profile_id = _profile_id
            AND m.is_active
          LIMIT 1;
        END IF;
      END IF;

      CONTINUE WHEN _user_id IS NULL;

      IF _type = 'pct' THEN
        _amount := ROUND(_total * _value / 100.0, 2);
      ELSE
        _amount := ROUND(_value, 2);
      END IF;

      INSERT INTO public.sale_commission_splits
        (organization_id, sale_id, user_id, product_name, source, source_ref, basis, rate, amount)
      VALUES
        (_org_id, p_sale_id, _user_id, _produto, _kind, COALESCE(_profile_id, _user_id), _type, _value, _amount);

      _sum := _sum + _amount;
    END LOOP;
  END LOOP;

  -- No product carried any rule: leave sales.comissao to whoever set it.
  IF NOT _any_rule THEN RETURN NULL; END IF;

  RETURN _sum;
END;
$$;

-- ============================================================
-- 4. Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_sale_commission_splits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sum numeric;
BEGIN
  _sum := public.generate_sale_commission_splits(NEW.id);

  -- NULL means no split rules apply to this sale, so the existing commission
  -- (energy engine, product catalog or manual) stays untouched.
  IF _sum IS NOT NULL AND _sum IS DISTINCT FROM COALESCE(NEW.comissao, -1) THEN
    -- `comissao` is not in the trigger's UPDATE OF list, so this does not recurse.
    UPDATE public.sales SET comissao = _sum WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sale_commission_splits_trg ON public.sales;
CREATE TRIGGER sync_sale_commission_splits_trg
  AFTER INSERT OR UPDATE OF servicos_produtos, servicos_details, total_value, created_by
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sale_commission_splits();
