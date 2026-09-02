-- Quantity-tiered commissions for telecom-operator products.
--
-- Extends generate_sale_commission_splits() (20260831210000_sale_commission_splits.sql)
-- to resolve a product's commission from `quantity_tiers` instead of a flat
-- `splits` array when the product is linked to an operator (public.operators)
-- with kind = 'telecom' and commission_basis = 'per_sale' or 'monthly_volume'.
--
-- quantity_tiers shape on a servicos_products_config entry:
--   [{"id":"…","min":1,"max":4,"splits":[ ...same split shape as before... ]},
--    {"id":"…","min":5,"max":null,"splits":[...]}]
-- max:null means "and above" (open-ended top band).
--
-- 'per_sale': the band is resolved from THIS sale's own quantity
--   (servicos_details->product->>'quantidade', default 1 when absent).
--
-- 'monthly_volume': the band is resolved from the ACCUMULATED quantity across
--   every sale of this product in the calendar month of this sale's sale_date
--   — scoped to this seller alone (volume_scope 'per_seller') or the whole
--   org (volume_scope 'org_total'). Whichever band that total falls in is
--   applied to EVERY sale in the group, each paying its OWN quantity at that
--   band's rate — so when a new sale pushes the group into a higher band,
--   sales already in the month are re-resolved to the new band, not just the
--   new one. That re-resolution is the "resync" step below.
--
-- Recursion guard: resyncing a sibling sale calls this same function for it,
-- which would try to resync its own siblings (including the sale that
-- started the whole pass) forever. A transaction-local flag
-- (senvia.op_resync) stops that: only the OUTERMOST call resyncs siblings.

-- ============================================================
-- 0. Safe numeric cast
-- ============================================================
-- Catalog tiers and a sale's servicos_details are hand-edited JSON. A bad
-- value ('' , 'abc') in quantidade/min/max must not raise — this runs inside
-- an AFTER INSERT/UPDATE trigger, so an uncaught cast error would abort the
-- whole sale save, not just the commission calc. NULL out instead.
CREATE OR REPLACE FUNCTION public._safe_numeric(p_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN NULLIF(p_text, '')::numeric;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sale_commission_splits(p_sale_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id       uuid;
  _created_by   uuid;
  _total        numeric;
  _produtos     text[];
  _details      jsonb;
  _sale_date    date;
  _catalog      jsonb;
  _produto      text;
  _cat_entry    jsonb;
  _operator_id  uuid;
  _op_kind      text;
  _op_basis     text;
  _op_scope     text;
  _qty_own      integer;
  _qty_for_tier numeric;
  _tier_splits  jsonb;
  _tier_attempted boolean;
  _is_tiered    boolean;
  _splits_arr   jsonb;
  _split        jsonb;
  _kind         text;
  _type         text;
  _value        numeric;
  _price        numeric;
  _user_id      uuid;
  _profile_id   uuid;
  _amount       numeric;
  _sum          numeric := 0;
  _any_rule     boolean := false;
  _month_start  date;
  _month_end    date;
  _is_resync    boolean := COALESCE(current_setting('senvia.op_resync', true), 'false') = 'true';
  _mv_produto   text;
  _mv_scope     text;
  _mv_month_start date;
  _mv_month_end   date;
  _mv_pending   jsonb := '[]'::jsonb; -- [{produto, scope, month_start, month_end}], monthly_volume products touched this call
  _mv_item      jsonb;
  _sibling_id   uuid;
  _sib_sum      numeric;
BEGIN
  SELECT organization_id, created_by, COALESCE(total_value, 0), servicos_produtos, servicos_details, sale_date
    INTO _org_id, _created_by, _total, _produtos, _details, _sale_date
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

  _month_start := date_trunc('month', COALESCE(_sale_date, CURRENT_DATE))::date;
  _month_end   := (_month_start + interval '1 month')::date;

  FOREACH _produto IN ARRAY _produtos LOOP
    -- Reset every per-product variable each iteration — a sale can carry
    -- several products, and a value left over from the PREVIOUS product
    -- (e.g. _op_kind still 'telecom' from a prior tiered product) would
    -- otherwise leak into this one's fallback decision below.
    _cat_entry      := NULL;
    _operator_id    := NULL;
    _op_kind        := NULL;
    _op_basis       := NULL;
    _op_scope       := NULL;
    _qty_for_tier   := NULL;
    _tier_splits    := NULL;
    _tier_attempted := false;
    _is_tiered      := false;
    _splits_arr     := NULL;

    SELECT c.entry INTO _cat_entry
    FROM jsonb_array_elements(_catalog) AS c(entry)
    WHERE c.entry->>'name' = _produto
    LIMIT 1;

    CONTINUE WHEN _cat_entry IS NULL;

    _operator_id := NULLIF(_cat_entry->>'operator_id', '')::uuid;
    _price       := COALESCE(public._safe_numeric(_cat_entry->>'price'), 0);
    _qty_own     := GREATEST(1, COALESCE(public._safe_numeric(_details->_produto->>'quantidade')::int, 1));

    -- Quantity-tiered product (telecom operator, per_sale or monthly_volume).
    IF _operator_id IS NOT NULL
       AND jsonb_typeof(_cat_entry->'quantity_tiers') = 'array'
       AND jsonb_array_length(_cat_entry->'quantity_tiers') > 0
    THEN
      SELECT kind, commission_basis, volume_scope INTO _op_kind, _op_basis, _op_scope
      FROM public.operators WHERE id = _operator_id;

      IF _op_kind = 'telecom' AND _op_basis IN ('per_sale', 'monthly_volume') THEN
        _tier_attempted := true;

        IF _op_basis = 'monthly_volume' THEN
          SELECT COALESCE(SUM(GREATEST(1, COALESCE(public._safe_numeric(s.servicos_details->_produto->>'quantidade')::int, 1))), 0)
            INTO _qty_for_tier
          FROM public.sales s
          WHERE s.organization_id = _org_id
            AND s.sale_date >= _month_start AND s.sale_date < _month_end
            AND _produto = ANY(s.servicos_produtos)
            AND (_op_scope = 'org_total' OR s.created_by = _created_by);

          -- Remember to resync the rest of this group after this sale is done
          -- (only the outermost call does the resync — see the guard below).
          _mv_pending := _mv_pending || jsonb_build_object(
            'produto', _produto, 'scope', _op_scope,
            'month_start', _month_start, 'month_end', _month_end
          );
        ELSE
          _qty_for_tier := _qty_own;
        END IF;

        SELECT t.entry->'splits' INTO _tier_splits
        FROM jsonb_array_elements(_cat_entry->'quantity_tiers') AS t(entry)
        WHERE _qty_for_tier >= COALESCE(public._safe_numeric(t.entry->>'min'), 1)
          AND (NULLIF(t.entry->>'max', '') IS NULL OR _qty_for_tier <= public._safe_numeric(t.entry->>'max'))
        LIMIT 1;

        -- Found a band: use it. No band matches this quantity: no commission
        -- for this product — never fall back to the flat splits below, that
        -- would silently ignore the escalões the admin configured.
        _splits_arr := _tier_splits;
        _is_tiered  := _tier_splits IS NOT NULL;
      END IF;
    END IF;

    -- Not tiered at all (no operator_id, an 'energia' operator, or a telecom
    -- operator with no tiers configured yet): fall back to the product's own
    -- flat splits, exactly as before this migration.
    IF NOT _tier_attempted THEN
      _splits_arr := _cat_entry->'splits';
    END IF;

    CONTINUE WHEN jsonb_typeof(_splits_arr) <> 'array';

    FOR _split IN SELECT s.entry FROM jsonb_array_elements(_splits_arr) AS s(entry) LOOP
      _any_rule := true;

      _kind  := COALESCE(_split->>'kind', 'user');
      _type  := COALESCE(_split->>'type', 'fixed');
      _value := COALESCE(public._safe_numeric(_split->>'value'), 0);

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

      -- A tiered rate is PER UNIT: the amount is the rate times THIS sale's
      -- own quantity, never the accumulated group total used to pick the
      -- band. A flat (non-tiered) split keeps behaving exactly as before.
      IF _is_tiered THEN
        IF _type = 'pct' THEN
          _amount := ROUND(_price * _value / 100.0 * _qty_own, 2);
        ELSE
          _amount := ROUND(_value * _qty_own, 2);
        END IF;
      ELSIF _type = 'pct' THEN
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

  -- Resync siblings of every monthly_volume product touched this call, so
  -- earlier sales this month move to the band the group total now supports.
  -- Guarded so a sibling's own resync pass never re-enters this one.
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
          AND (_mv_scope = 'org_total' OR s.created_by = _created_by)
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

  RETURN _sum;
END;
$$;

COMMENT ON FUNCTION public.generate_sale_commission_splits(uuid) IS
  'Freezes per-beneficiary commission for a sale. Resolves each product''s flat splits, or — for a telecom-operator product with quantity_tiers — the band matching this sale''s quantity (per_sale) or the accumulated monthly quantity in scope (monthly_volume). monthly_volume additionally resyncs every other sale in the same org/product/month/scope so the whole group moves to a new band together; a transaction-local flag (senvia.op_resync) stops that resync from recursing into itself.';

-- ============================================================
-- sale_date now decides which month a monthly_volume band is resolved
-- against, so a sale_date-only edit must refresh the splits too — it was not
-- in the original trigger's watch list (added 20260831210000, before
-- quantity tiers existed).
-- ============================================================
DROP TRIGGER IF EXISTS sync_sale_commission_splits_trg ON public.sales;
CREATE TRIGGER sync_sale_commission_splits_trg
  AFTER INSERT OR UPDATE OF servicos_produtos, servicos_details, total_value, created_by, sale_date
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sale_commission_splits();
