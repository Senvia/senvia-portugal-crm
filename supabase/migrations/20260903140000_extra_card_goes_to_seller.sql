-- Extra-card money belongs to the SELLER, whole — not shared out.
--
-- 20260903120000 split it among the product's recipients in proportion to
-- their base commission, which paid the seller a slice instead of the rate:
-- a 10€ extra card on a product paying 530€ across three people gave the
-- seller 10 × 170/530 = 3,21€ instead of the 10€ he had actually earned.
--
-- It is now one row of its own for sales.created_by, on top of whatever the
-- splits pay him. Everything else in this function is unchanged.

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
  _mv_pending   jsonb := '[]'::jsonb;
  _mv_item      jsonb;
  _sibling_id   uuid;
  _sib_sum      numeric;
  _extra_rate   numeric;
  _extra_qty    numeric;
  _extra_total  numeric;
BEGIN
  SELECT organization_id, created_by, COALESCE(total_value, 0), servicos_produtos, servicos_details, sale_date
    INTO _org_id, _created_by, _total, _produtos, _details, _sale_date
  FROM public.sales WHERE id = p_sale_id;

  IF _org_id IS NULL THEN RETURN NULL; END IF;

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
    _extra_rate     := 0;
    _extra_qty      := 0;
    _extra_total    := 0;

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

    -- The extra cards pay the SELLER, whole, on top of whatever the splits
    -- below pay him. Written before the splits are even resolved so it still
    -- lands when a product carries extra cards but no commission rule.
    IF _extra_total <> 0 AND _created_by IS NOT NULL THEN
      INSERT INTO public.sale_commission_splits
        (organization_id, sale_id, user_id, product_name, source, source_ref, basis, rate, amount)
      VALUES
        (_org_id, p_sale_id, _created_by, _produto, 'user', _created_by, 'fixed', _extra_rate, _extra_total);

      _sum := _sum + _extra_total;
      _any_rule := true;
    END IF;

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

        _tier_splits    := _tier_entry->'splits';
        _tier_price     := COALESCE(public._safe_numeric(_tier_entry->>'price'), _price);
        _tier_bonus     := COALESCE(public._safe_numeric(_tier_entry->>'bonus'), 0);
        _tier_bonus_type := COALESCE(_tier_entry->>'bonus_type', 'fixed');
        _splits_arr     := _tier_splits;
        _is_tiered      := _tier_entry IS NOT NULL;

        IF _is_tiered AND _tier_bonus <> 0 THEN
          SELECT COALESCE(SUM(COALESCE(public._safe_numeric(s.entry->>'value'), 0)), 0), COUNT(*)
            INTO _bonus_weight_sum, _splits_count
          FROM jsonb_array_elements(_splits_arr) AS s(entry);

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

      IF _is_tiered THEN
        IF _type = 'pct' THEN
          _amount := ROUND(_tier_price * _value / 100.0 * _qty_own, 2);
        ELSE
          _amount := ROUND(_value * _qty_own, 2);
        END IF;

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
        _amount := ROUND(_value * _qty_own, 2);
      END IF;

      INSERT INTO public.sale_commission_splits
        (organization_id, sale_id, user_id, product_name, source, source_ref, basis, rate, amount)
      VALUES
        (_org_id, p_sale_id, _user_id, _produto, _kind, COALESCE(_profile_id, _user_id), _type, _value, _amount);

      _sum := _sum + _amount;
    END LOOP;
  END LOOP;

  IF NOT _any_rule THEN RETURN NULL; END IF;

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
