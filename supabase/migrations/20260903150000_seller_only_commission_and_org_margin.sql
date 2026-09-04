-- The commission table is a RATE TABLE keyed by who sold — not a list of
-- people to pay at once.
--
-- "Sara 160 / Vitor 140" never meant 300. It means: Sara sells → she gets
-- 160; Vitor sells → he gets 140. Exactly ONE line pays per sale, the one
-- matching the seller, and a line naming him wins over the generic
-- "Perfil: Vendedor" line.
--
-- What the operator pays the org is its own number (`operator_pays` on the
-- product, or on the matched band when the product has escalões). The seller
-- takes his rate out of it and the difference stays with the organization —
-- that is sales.org_commission, the "Valor da Organização".
--
-- sales.comissao becomes the GROSS (what the operator pays), so the client
-- totals and the finance views keep meaning "what this sale brought in".

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS org_commission numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.sales.org_commission IS
  'What is left for the organization after the seller takes his rate: sum over lines of (operator_pays - seller rate). Frozen with the splits.';

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
  SELECT organization_id, created_by, servicos_produtos, servicos_details, sale_date
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

  -- Which profile the seller holds, for the generic "Perfil: Vendedor" line.
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

    -- Quantity band, when the operator prices by volume.
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

        -- No band matches this quantity: nothing is owed on this product.
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

    -- THE seller's line: his own beats the generic profile one.
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

    -- Bónus Geral of the band: a once-off reward for reaching it, and the
    -- seller's, whole. For monthly_volume only the group's latest sale
    -- carries it, so a resync never pays it twice.
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
          AND (_op_scope = 'org_total' OR s.created_by = _created_by)
        ORDER BY s.sale_date DESC, s.created_at DESC, s.id DESC
        LIMIT 1;
        _award_bonus := (_latest_sale_id = p_sale_id);
      ELSE
        _award_bonus := true;
      END IF;

      IF NOT _award_bonus THEN _bonus_amount := 0; END IF;
    END IF;

    _seller_amount := ROUND(_seller_rate * _qty_own + _bonus_amount + _extra_total, 2);

    -- What the operator pays. With no rate configured yet there is no way to
    -- know the org's margin, so the gross is taken as the seller's own amount
    -- and the margin is zero — never a made-up (or negative) number.
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

  -- Resync the rest of a monthly_volume group so earlier sales move to the
  -- band the month's total now supports.
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

  -- sales.comissao is the GROSS: what the operator pays the org.
  RETURN _sum_gross;
END;
$$;
