-- ============================================================
-- Assigning a sale to a salesperson
-- ============================================================
-- Until now the seller was always whoever typed the sale in (created_by), so
-- an admin entering a sale on behalf of someone else paid the commission to
-- himself. seller_id records who actually made the sale; created_by stays as
-- the audit trail of who entered it. NULL means "the person who created it",
-- so every existing sale keeps behaving exactly as before.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sales.seller_id IS
  'Who made the sale and is paid the commission. NULL falls back to created_by. Only admins can set it.';

CREATE INDEX IF NOT EXISTS idx_sales_org_seller
  ON public.sales (organization_id, seller_id);

-- ============================================================
-- A sale assigned to someone must be visible to that someone
-- ============================================================
DROP POLICY IF EXISTS "Users view org sales v2" ON public.sales;

CREATE POLICY "Users view org sales v2" ON public.sales
FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR created_by = auth.uid()
    OR seller_id = auth.uid()
    OR client_id IN (
      SELECT id FROM public.crm_clients WHERE assigned_to = auth.uid()
    )
    OR lead_id IN (
      SELECT id FROM public.leads WHERE assigned_to = auth.uid()
    )
  )
);

-- ============================================================
-- Only admins may change who a sale belongs to
-- ============================================================
-- Without this a salesperson could hand himself somebody else's commission by
-- editing his own sale.
CREATE OR REPLACE FUNCTION public.enforce_sale_seller_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;  -- service role / server-side jobs
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- A NULL seller_id and one that just repeats created_by mean the same
  -- thing (the sale is not reassigned), so compare who the sale actually
  -- belongs to, not the raw column. Without this, the edit screen resending
  -- seller_id on every save — which it does, since it always shows the
  -- current owner — would trip this check for every non-admin editing his
  -- own sale.
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.seller_id, NEW.created_by) IS DISTINCT FROM NEW.created_by THEN
      RAISE EXCEPTION 'Só administradores podem atribuir uma venda a outro vendedor';
    END IF;
  ELSIF COALESCE(NEW.seller_id, NEW.created_by) IS DISTINCT FROM COALESCE(OLD.seller_id, OLD.created_by) THEN
    RAISE EXCEPTION 'Só administradores podem atribuir uma venda a outro vendedor';
  END IF;

  RETURN NEW;
END;
$$;

-- Split into an INSERT trigger and a WHEN-guarded UPDATE trigger: only the
-- latter can compare OLD to NEW, and only a real change in ownership should
-- fire it — not merely seller_id being present in the SET clause, which is
-- true on every save from the edit screen.
DROP TRIGGER IF EXISTS trg_enforce_sale_seller_assignment ON public.sales;
DROP TRIGGER IF EXISTS trg_enforce_sale_seller_assignment_insert ON public.sales;
DROP TRIGGER IF EXISTS trg_enforce_sale_seller_assignment_update ON public.sales;

CREATE TRIGGER trg_enforce_sale_seller_assignment_insert
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_seller_assignment();

CREATE TRIGGER trg_enforce_sale_seller_assignment_update
  BEFORE UPDATE OF seller_id ON public.sales
  FOR EACH ROW
  WHEN (COALESCE(NEW.seller_id, NEW.created_by) IS DISTINCT FROM COALESCE(OLD.seller_id, OLD.created_by))
  EXECUTE FUNCTION public.enforce_sale_seller_assignment();

-- ============================================================
-- The commission follows the seller, not the typist
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_sale_commission_splits(p_sale_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id       uuid;
  _created_by   uuid;
  _produtos     text[];
  _details      jsonb;
  _sale_date    date;
  _catalog      jsonb;
  _produto      text;
  _cat_entry    jsonb;
  _operator_id  uuid;
  _op_basis     text;
  _op_scope     text;
  _qty_own      integer;
  _qty_for_tier numeric;
  _tier_entry   jsonb;
  _tier_price   numeric;
  _tier_bonus   numeric;
  _tier_bonus_type text;
  _bonus_amount numeric;
  _award_bonus  boolean;
  _latest_sale_id uuid;
  _is_tiered    boolean;
  _splits_arr   jsonb;
  _seller_split jsonb;
  _seller_profile uuid;
  _unit_price   numeric;
  _price        numeric;
  _seller_rate  numeric;
  _seller_amount numeric;
  _gross        numeric;
  _operator_pays numeric;
  _extra_rate   numeric;
  _extra_qty    numeric;
  _extra_total  numeric;
  _sum_gross    numeric := 0;
  _sum_seller   numeric := 0;
  _any_rule     boolean := false;
  _month_start  date;
  _month_end    date;
  _is_resync    boolean := COALESCE(current_setting('senvia.op_resync', true), 'false') = 'true';
  _mv_pending   jsonb := '[]'::jsonb;
  _mv_item      jsonb;
  _mv_produto   text;
  _mv_scope     text;
  _mv_month_start date;
  _mv_month_end   date;
  _sibling_id   uuid;
  _sib_sum      numeric;
BEGIN
  -- The seller is who the sale was assigned to; who typed it in is irrelevant
  -- to the money. _created_by carries the seller from here on.
  SELECT organization_id, COALESCE(seller_id, created_by), servicos_produtos, servicos_details, sale_date
    INTO _org_id, _created_by, _produtos, _details, _sale_date
  FROM public.sales WHERE id = p_sale_id;
  IF _org_id IS NULL THEN RETURN NULL; END IF;
  DELETE FROM public.sale_commission_splits WHERE sale_id = p_sale_id;
  IF _produtos IS NULL OR array_length(_produtos, 1) IS NULL THEN
    UPDATE public.sales SET org_commission = 0 WHERE id = p_sale_id AND org_commission <> 0;
    RETURN NULL;
  END IF;
  SELECT servicos_products_config::jsonb INTO _catalog
  FROM public.organizations WHERE id = _org_id;
  IF _catalog IS NULL OR jsonb_typeof(_catalog) <> 'array' THEN RETURN NULL; END IF;
  IF _created_by IS NOT NULL THEN
    SELECT m.profile_id INTO _seller_profile
    FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = _created_by AND m.is_active
    LIMIT 1;
  END IF;
  _month_start := date_trunc('month', COALESCE(_sale_date, CURRENT_DATE))::date;
  _month_end   := (_month_start + interval '1 month')::date;
  FOREACH _produto IN ARRAY _produtos LOOP
    _cat_entry    := NULL;
    _operator_id  := NULL;
    _op_basis     := NULL;
    _op_scope     := NULL;
    _qty_for_tier := NULL;
    _tier_entry   := NULL;
    _tier_price   := NULL;
    _tier_bonus   := 0;
    _tier_bonus_type := 'fixed';
    _bonus_amount := 0;
    _award_bonus  := false;
    _latest_sale_id := NULL;
    _is_tiered    := false;
    _splits_arr   := NULL;
    _seller_split := NULL;
    _seller_rate  := 0;
    _operator_pays := NULL;
    _extra_total  := 0;
    SELECT c.entry INTO _cat_entry
    FROM jsonb_array_elements(_catalog) AS c(entry)
    WHERE c.entry->>'name' = _produto
    LIMIT 1;
    CONTINUE WHEN _cat_entry IS NULL;
    _operator_id := NULLIF(_cat_entry->>'operator_id', '')::uuid;
    _price       := COALESCE(public._safe_numeric(_cat_entry->>'price'), 0);
    _qty_own     := GREATEST(1, COALESCE(public._safe_numeric(_details->_produto->>'quantidade')::int, 1));
    _extra_rate := COALESCE(public._safe_numeric(_cat_entry->>'extra_card_commission'), 0);
    _extra_qty  := COALESCE(public._safe_numeric(_details->_produto->>'extra_cards_portability'), 0)
                 + COALESCE(public._safe_numeric(_details->_produto->>'extra_cards_new'), 0);
    _extra_total := ROUND(_extra_rate * _extra_qty, 2);
    IF _operator_id IS NOT NULL
       AND jsonb_typeof(_cat_entry->'quantity_tiers') = 'array'
       AND jsonb_array_length(_cat_entry->'quantity_tiers') > 0
    THEN
      SELECT commission_basis, volume_scope INTO _op_basis, _op_scope
      FROM public.operators WHERE id = _operator_id;
      IF _op_basis IN ('per_sale', 'monthly_volume') THEN
        IF _op_basis = 'monthly_volume' THEN
          SELECT COALESCE(SUM(GREATEST(1, COALESCE(public._safe_numeric(s.servicos_details->_produto->>'quantidade')::int, 1))), 0)
            INTO _qty_for_tier
          FROM public.sales s
          WHERE s.organization_id = _org_id
            AND s.sale_date >= _month_start AND s.sale_date < _month_end
            AND _produto = ANY(s.servicos_produtos)
            AND (_op_scope = 'org_total' OR COALESCE(s.seller_id, s.created_by) = _created_by);
          _mv_pending := _mv_pending || jsonb_build_object(
            'produto', _produto, 'scope', _op_scope,
            'month_start', _month_start, 'month_end', _month_end
          );
        ELSE
          _qty_for_tier := _qty_own;
        END IF;
        SELECT t.entry INTO _tier_entry
        FROM jsonb_array_elements(_cat_entry->'quantity_tiers') AS t(entry)
        WHERE _qty_for_tier >= COALESCE(public._safe_numeric(t.entry->>'min'), 1)
          AND (NULLIF(t.entry->>'max', '') IS NULL OR _qty_for_tier <= public._safe_numeric(t.entry->>'max'))
        LIMIT 1;
        CONTINUE WHEN _tier_entry IS NULL;
        _is_tiered   := true;
        _splits_arr  := _tier_entry->'splits';
        _tier_price  := COALESCE(public._safe_numeric(_tier_entry->>'price'), _price);
        _tier_bonus  := COALESCE(public._safe_numeric(_tier_entry->>'bonus'), 0);
        _tier_bonus_type := COALESCE(_tier_entry->>'bonus_type', 'fixed');
        _operator_pays := public._safe_numeric(_tier_entry->>'operator_pays');
      END IF;
    END IF;
    IF NOT _is_tiered THEN
      _splits_arr := _cat_entry->'splits';
    END IF;
    _unit_price := COALESCE(_tier_price, _price);
    IF _operator_pays IS NULL THEN
      _operator_pays := public._safe_numeric(_cat_entry->>'operator_pays');
    END IF;
    IF jsonb_typeof(_splits_arr) = 'array' THEN
      SELECT s.entry INTO _seller_split
      FROM jsonb_array_elements(_splits_arr) AS s(entry)
      WHERE COALESCE(s.entry->>'kind', 'user') = 'user'
        AND _created_by IS NOT NULL
        AND NULLIF(s.entry->>'user_id', '')::uuid = _created_by
      LIMIT 1;
      IF _seller_split IS NULL AND _seller_profile IS NOT NULL THEN
        SELECT s.entry INTO _seller_split
        FROM jsonb_array_elements(_splits_arr) AS s(entry)
        WHERE s.entry->>'kind' = 'profile'
          AND NULLIF(s.entry->>'profile_id', '')::uuid = _seller_profile
        LIMIT 1;
      END IF;
    END IF;
    IF _seller_split IS NOT NULL THEN
      _seller_rate := CASE
        WHEN COALESCE(_seller_split->>'type', 'fixed') = 'pct'
          THEN ROUND(_unit_price * COALESCE(public._safe_numeric(_seller_split->>'value'), 0) / 100.0, 2)
        ELSE COALESCE(public._safe_numeric(_seller_split->>'value'), 0)
      END;
    END IF;
    IF _is_tiered AND _tier_bonus <> 0 THEN
      IF _tier_bonus_type = 'pct' THEN
        _bonus_amount := ROUND(_seller_rate * _qty_own * _tier_bonus / 100.0, 2);
      ELSE
        _bonus_amount := _tier_bonus;
      END IF;
      IF _op_basis = 'monthly_volume' THEN
        SELECT s.id INTO _latest_sale_id
        FROM public.sales s
        WHERE s.organization_id = _org_id
          AND s.sale_date >= _month_start AND s.sale_date < _month_end
          AND _produto = ANY(s.servicos_produtos)
          AND (_op_scope = 'org_total' OR COALESCE(s.seller_id, s.created_by) = _created_by)
        ORDER BY s.sale_date DESC, s.created_at DESC, s.id DESC
        LIMIT 1;
        _award_bonus := (_latest_sale_id = p_sale_id);
      ELSE
        _award_bonus := true;
      END IF;
      IF NOT _award_bonus THEN _bonus_amount := 0; END IF;
    END IF;
    _seller_amount := ROUND(_seller_rate * _qty_own + _bonus_amount + _extra_total, 2);
    IF _operator_pays IS NOT NULL THEN
      _gross := ROUND(_operator_pays * _qty_own + _bonus_amount + _extra_total, 2);
    ELSE
      _gross := _seller_amount;
    END IF;
    CONTINUE WHEN _gross = 0 AND _seller_amount = 0;
    _any_rule := true;
    IF _created_by IS NOT NULL AND _seller_amount <> 0 THEN
      INSERT INTO public.sale_commission_splits
        (organization_id, sale_id, user_id, product_name, source, source_ref, basis, rate, amount)
      VALUES
        (_org_id, p_sale_id, _created_by, _produto, 'user', _created_by, 'fixed', _seller_rate, _seller_amount);
    END IF;
    _sum_gross  := _sum_gross + _gross;
    _sum_seller := _sum_seller + _seller_amount;
  END LOOP;
  IF NOT _any_rule THEN RETURN NULL; END IF;
  UPDATE public.sales
     SET org_commission = GREATEST(ROUND(_sum_gross - _sum_seller, 2), 0)
   WHERE id = p_sale_id;
  IF NOT _is_resync AND jsonb_array_length(_mv_pending) > 0 THEN
    PERFORM set_config('senvia.op_resync', 'true', true);
    FOR _mv_item IN SELECT * FROM jsonb_array_elements(_mv_pending) LOOP
      _mv_produto     := _mv_item->>'produto';
      _mv_scope       := _mv_item->>'scope';
      _mv_month_start := (_mv_item->>'month_start')::date;
      _mv_month_end   := (_mv_item->>'month_end')::date;
      FOR _sibling_id IN
        SELECT s.id FROM public.sales s
        WHERE s.organization_id = _org_id
          AND s.id <> p_sale_id
          AND s.sale_date >= _mv_month_start AND s.sale_date < _mv_month_end
          AND _mv_produto = ANY(s.servicos_produtos)
          AND (_mv_scope = 'org_total' OR COALESCE(s.seller_id, s.created_by) = _created_by)
      LOOP
        _sib_sum := public.generate_sale_commission_splits(_sibling_id);
        IF _sib_sum IS NOT NULL THEN
          UPDATE public.sales SET comissao = _sib_sum
          WHERE id = _sibling_id AND comissao IS DISTINCT FROM _sib_sum;
        END IF;
      END LOOP;
    END LOOP;
    PERFORM set_config('senvia.op_resync', 'false', true);
  END IF;
  RETURN _sum_gross;
END;
$$;

-- ============================================================
-- Reassigning a sale must move the commission with it
-- ============================================================
CREATE OR REPLACE FUNCTION public.resync_sale_commission_on_seller_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sum numeric;
BEGIN
  _sum := public.generate_sale_commission_splits(NEW.id);
  IF _sum IS NOT NULL THEN
    UPDATE public.sales SET comissao = _sum
    WHERE id = NEW.id AND comissao IS DISTINCT FROM _sum;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_resync_sale_commission_on_seller_change ON public.sales;
CREATE TRIGGER trg_resync_sale_commission_on_seller_change
  AFTER UPDATE OF seller_id ON public.sales
  FOR EACH ROW
  -- Same functional comparison as the enforcement trigger above: a NULL
  -- seller_id and one that repeats created_by are the same owner, so a save
  -- that merely echoes the current owner back must not re-run this.
  WHEN (COALESCE(NEW.seller_id, NEW.created_by) IS DISTINCT FROM COALESCE(OLD.seller_id, OLD.created_by))
  EXECUTE FUNCTION public.resync_sale_commission_on_seller_change();
