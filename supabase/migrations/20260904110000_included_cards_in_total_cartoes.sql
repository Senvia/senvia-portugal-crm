-- ============================================================
-- sales.total_cartoes now counts included cards, not just quantidade
-- ============================================================
-- Before: total_cartoes summed each product line's `quantidade` — meaningful
-- only for quantity-tiered products, so every other product line contributed
-- 0 cards, correctly, since a non-tiered line never carries `quantidade`.
--
-- Now: a quantity-tiered line still contributes quantidade × included_cards
-- (defaulting included_cards to 1 there, so it counts exactly as before
-- unless configured otherwise). A NON-tiered line — most products, e.g.
-- Alarme or Energia Residencial, which aren't SIM cards at all — contributes
-- ONLY its own `included_cards` if the catalog product sets one, and 0
-- otherwise. Getting this backwards (defaulting every unconfigured product
-- to 1) would count every Alarme/Energia sale as a card it doesn't carry.
-- Matches the catalog product by NAME as generate_sale_commission_splits()
-- does (first hit, LIMIT 1) — kept consistent with that function rather than
-- also disambiguating by operator_id, which it doesn't do either.
--
-- A line that carries `total_cards` (the seller typed the real card count
-- for the line — see ServicosSection) uses that number directly instead:
-- it's already the ground truth, not something to add included_cards on
-- top of.
--
-- This changes what total_cartoes means for EVERY existing sale, but the
-- trigger only re-fires on INSERT or UPDATE OF servicos_details — existing
-- rows keep their old number until that sale is touched again. Recalc block
-- below is optional, to bring existing sales in line right away.

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
          GREATEST(1, COALESCE(public._safe_numeric(entry.value->>'quantidade'), 1))
            * COALESCE((
                SELECT public._safe_numeric(c.entry->>'included_cards')
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

-- Optional: recompute every existing sale right now instead of waiting for
-- each one to be edited again. Safe to run — it's the same trigger logic,
-- just applied immediately.
UPDATE public.sales SET servicos_details = servicos_details
WHERE servicos_details IS NOT NULL AND jsonb_typeof(servicos_details) = 'object';
