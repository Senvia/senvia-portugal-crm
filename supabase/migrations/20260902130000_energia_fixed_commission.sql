-- Three extensions to the quantity-tiered commission model on top of
-- 20260902110000_operator_quantity_tier_splits.sql:
--
-- 1. Energia operators can now opt out of Matriz de Comissões and use the
--    same fixed-value commission (per_sale / monthly_volume quantity tiers)
--    as telecom. commission_basis is no longer telecom-exclusive: NULL still
--    means "use Matriz de Comissões" for an energia operator, but a non-NULL
--    value now means "use the fixed-value editor", for EITHER kind.
--
-- 2. A tier can override the product's price for units sold in that band
--    (e.g. a Digi line is 6€ alone, 5,5€ each from 2, 5€ each from 3) — used
--    for 'pct' splits within a tiered product.
--
-- 3. A tier can carry a one-off "Bónus Geral": a company-wide amount earned
--    once for REACHING the band (e.g. 15-19 contracts this month earns
--    +300€, 20-24 earns +600€), never multiplied by quantity, and shared out
--    among that tier's own splits in proportion to their value. Either a
--    flat euro amount, or (bonus_type = 'pct') a percentage of the tier's
--    own combined commission at the quantity that matched the band (10
--    units earning 100€ commission + 50% bonus = +50€). For 'monthly_volume'
--    only the sale that is currently the group's latest (by date) carries
--    it — the existing resync-on-change mechanism moves it automatically as
--    new sales come in. For 'per_sale' it just applies to that one sale.
--    A product that doesn't actually vary by quantity (e.g. Digi's DIGI TV)
--    just gets one band spanning everything (min 1, max ∞) — same mechanism,
--    no separate flat-commission code path needed.

-- ============================================================
-- 1. Drop the telecom-only constraint on commission_basis.
-- volume_scope's "only under monthly_volume" constraint is unaffected and
-- unchanged — it never depended on kind.
-- ============================================================
ALTER TABLE public.operators DROP CONSTRAINT IF EXISTS operators_basis_only_telecom;

COMMENT ON COLUMN public.operators.commission_basis IS
  'NULL: energia operator using Matriz de Comissões (meaningless for telecom, which always has a basis). per_sale/monthly_volume: fixed-value commission with quantity tiers, for either kind — see generate_sale_commission_splits().';

-- ============================================================
-- 2. generate_sale_commission_splits(): kind-agnostic tiered path, tier-level
-- price override for pct splits, and the general per-tier bonus.
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
  _tier_entry   jsonb;
  _tier_splits  jsonb;
  _tier_price   numeric;
  _tier_bonus   numeric;
  _tier_bonus_type text;
  _tier_base_commission numeric;
  _tier_bonus_amount numeric;
  _bonus_weight_sum numeric;
  _splits_count integer;
  _award_bonus  boolean;
  _latest_sale_id uuid;
  _bonus_share  numeric;
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
    -- would otherwise leak into this one's fallback decision below.
    _cat_entry      := NULL;
    _operator_id    := NULL;
    _op_kind        := NULL;
    _op_basis       := NULL;
    _op_scope       := NULL;
    _qty_for_tier   := NULL;
    _tier_entry     := NULL;
    _tier_splits    := NULL;
    _tier_price     := NULL;
    _tier_bonus     := 0;
    _tier_bonus_type := 'fixed';
    _tier_base_commission := 0;
    _tier_bonus_amount := 0;
    _bonus_weight_sum := 0;
    _splits_count   := 0;
    _award_bonus    := false;
    _latest_sale_id := NULL;
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

    -- Quantity-tiered product: any operator (telecom OR energia) with a
    -- fixed commission_basis, and at least one band configured. A product
    -- that doesn't actually vary by quantity (e.g. Digi's DIGI TV) just gets
    -- one band spanning everything (min 1, max ∞) — no separate flat mode.
    IF _operator_id IS NOT NULL
       AND jsonb_typeof(_cat_entry->'quantity_tiers') = 'array'
       AND jsonb_array_length(_cat_entry->'quantity_tiers') > 0
    THEN
      SELECT kind, commission_basis, volume_scope INTO _op_kind, _op_basis, _op_scope
      FROM public.operators WHERE id = _operator_id;

      IF _op_basis IN ('per_sale', 'monthly_volume') THEN
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

        SELECT t.entry INTO _tier_entry
        FROM jsonb_array_elements(_cat_entry->'quantity_tiers') AS t(entry)
        WHERE _qty_for_tier >= COALESCE(public._safe_numeric(t.entry->>'min'), 1)
          AND (NULLIF(t.entry->>'max', '') IS NULL OR _qty_for_tier <= public._safe_numeric(t.entry->>'max'))
        LIMIT 1;

        -- Found a band: use it, and its own price when set (e.g. a Digi line
        -- is 6€ alone, 5€ each from 3), else fall back to the product's flat
        -- price. No band matches this quantity: no commission for this
        -- product — never fall back to the flat splits below, that would
        -- silently ignore the escalões the admin configured.
        _tier_splits    := _tier_entry->'splits';
        _tier_price     := COALESCE(public._safe_numeric(_tier_entry->>'price'), _price);
        _tier_bonus     := COALESCE(public._safe_numeric(_tier_entry->>'bonus'), 0);
        _tier_bonus_type := COALESCE(_tier_entry->>'bonus_type', 'fixed');
        _splits_arr     := _tier_splits;
        _is_tiered      := _tier_entry IS NOT NULL;

        -- The Bónus Geral is a once-off reward for REACHING the band, not a
        -- per-unit rate. For 'monthly_volume' only the sale that is
        -- currently the group's latest (by date) carries it, so a resync
        -- never multiplies it by the number of sales in scope — as new
        -- sales land, generate_sale_commission_splits recomputes every sale
        -- in the group and the bonus simply moves to the new latest one.
        IF _is_tiered AND _tier_bonus <> 0 THEN
          SELECT COALESCE(SUM(COALESCE(public._safe_numeric(s.entry->>'value'), 0)), 0), COUNT(*)
            INTO _bonus_weight_sum, _splits_count
          FROM jsonb_array_elements(_splits_arr) AS s(entry);

          -- 'pct' resolves against the tier's own combined commission (every
          -- split, summed) at the GROUP quantity that matched this band —
          -- e.g. 10 units earning 100€ commission with a 50% bonus pays
          -- +50€. 'fixed' is just the configured euro amount.
          IF _tier_bonus_type = 'pct' THEN
            SELECT COALESCE(SUM(
              CASE WHEN COALESCE(s.entry->>'type', 'fixed') = 'pct'
                THEN _tier_price * COALESCE(public._safe_numeric(s.entry->>'value'), 0) / 100.0
                ELSE COALESCE(public._safe_numeric(s.entry->>'value'), 0)
              END
            ), 0) * _qty_for_tier
              INTO _tier_base_commission
            FROM jsonb_array_elements(_splits_arr) AS s(entry);

            _tier_bonus_amount := ROUND(_tier_base_commission * _tier_bonus / 100.0, 2);
          ELSE
            _tier_bonus_amount := _tier_bonus;
          END IF;

          IF _op_basis = 'monthly_volume' THEN
            SELECT s.id INTO _latest_sale_id
            FROM public.sales s
            WHERE s.organization_id = _org_id
              AND s.sale_date >= _month_start AND s.sale_date < _month_end
              AND _produto = ANY(s.servicos_produtos)
              AND (_op_scope = 'org_total' OR s.created_by = _created_by)
            ORDER BY s.sale_date DESC, s.created_at DESC, s.id DESC
            LIMIT 1;
            _award_bonus := (_latest_sale_id = p_sale_id);
          ELSE
            _award_bonus := true;
          END IF;
        END IF;
      END IF;
    END IF;

    -- Not tiered at all (no operator_id, an energia operator still on Matriz
    -- de Comissões, or an operator with no tiers configured yet): fall back
    -- to the product's own flat splits, exactly as before this migration.
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
      -- band. 'pct' uses the matched band's own price (falls back to the
      -- product's flat price when the band has none). A flat (non-tiered)
      -- split keeps behaving exactly as before.
      IF _is_tiered THEN
        IF _type = 'pct' THEN
          _amount := ROUND(_tier_price * _value / 100.0 * _qty_own, 2);
        ELSE
          _amount := ROUND(_value * _qty_own, 2);
        END IF;

        -- This split's share of the tier's Bónus Geral, in proportion to its
        -- own value among the tier's splits (equal share if every value is
        -- 0). Only the sale chosen above (_award_bonus) carries it.
        IF _award_bonus THEN
          _bonus_share := CASE
            WHEN _bonus_weight_sum > 0 THEN ROUND(_tier_bonus_amount * _value / _bonus_weight_sum, 2)
            ELSE ROUND(_tier_bonus_amount / NULLIF(_splits_count, 0), 2)
          END;
          _amount := _amount + COALESCE(_bonus_share, 0);
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
  -- earlier sales this month move to the band the group total now supports
  -- (and the Bónus Geral moves to whichever sale is now the group's latest).
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
  'Freezes per-beneficiary commission for a sale. Resolves each product''s flat splits, or — for a product on an operator (telecom or energia) with a fixed commission_basis and quantity_tiers — the band matching this sale''s quantity (per_sale) or the accumulated monthly quantity in scope (monthly_volume), using that band''s own price for pct splits and awarding its one-off Bónus Geral (split proportionally among the band''s recipients, only to the group''s currently-latest sale for monthly_volume). monthly_volume additionally resyncs every other sale in the same org/product/month/scope so the whole group moves to a new band (and the bonus) together; a transaction-local flag (senvia.op_resync) stops that resync from recursing into itself.';
