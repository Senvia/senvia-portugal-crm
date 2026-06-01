-- Unified commission model — Phase 1.
--
-- Adds a per-product commission catalog so telecom (and any non-energy) orgs
-- can have automatic commission calculation per sale, without forcing them
-- through the energy CPE engine. Energy proposals keep their existing engine.
--
-- How it works:
--   1. Admin sets `commission_value` (and optionally `commission_renewal_value`)
--      on each product in Definições → Produtos.
--   2. When a sale is created, a trigger fills `sales.comissao` with:
--        sum( proposal_product.quantity * product.commission_value )
--      multiplied by the negotiation_type multiplier (renewal = 0.25, others = 1).
--   3. If the proposal has CPEs (energy), the trigger does NOT touch
--      `sales.comissao` — the existing useLiveCommissions engine owns that path.
--   4. If `sales.comissao` was already filled (manual override), the trigger
--      respects it.
--
-- Downstream (Comissões a Pagar card, As Minhas Comissões, Aprovar Instalações)
-- all read `sales.comissao` consistently.

-- ============================================================
-- 1. Per-product commission fields
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_value numeric;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_renewal_value numeric;

COMMENT ON COLUMN public.products.commission_value IS
  'Default commission earned per unit sold (typically used for telecom / fixed-commission products). Energy products with CPEs ignore this and use the CPE engine.';
COMMENT ON COLUMN public.products.commission_renewal_value IS
  'Commission per unit on contract renewal. If null, falls back to commission_value * 0.25.';

-- ============================================================
-- 2. Computation function
-- ============================================================
-- Returns the commission for a sale derived from its proposal's products.
-- Returns NULL when the proposal has CPEs (signals to the trigger NOT to touch
-- sales.comissao — that's the energy engine's responsibility).
CREATE OR REPLACE FUNCTION public.compute_sale_commission(p_sale_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _proposal_id uuid;
  _neg_type text;
  _has_cpes boolean;
  _total numeric := 0;
BEGIN
  SELECT proposal_id INTO _proposal_id FROM public.sales WHERE id = p_sale_id;
  IF _proposal_id IS NULL THEN RETURN 0; END IF;

  -- Energy proposals (with CPEs) are handled by useLiveCommissions
  SELECT EXISTS (SELECT 1 FROM public.proposal_cpes WHERE proposal_id = _proposal_id) INTO _has_cpes;
  IF _has_cpes THEN RETURN NULL; END IF;

  SELECT negotiation_type INTO _neg_type FROM public.proposals WHERE id = _proposal_id;

  IF _neg_type = 'renovacao' THEN
    -- Use renewal value if set, else fall back to 25% of base
    SELECT COALESCE(SUM(
      COALESCE(p.commission_renewal_value, p.commission_value * 0.25, 0)
        * COALESCE(pp.quantity, 1)
    ), 0)
    INTO _total
    FROM public.proposal_products pp
    JOIN public.products p ON p.id = pp.product_id
    WHERE pp.proposal_id = _proposal_id;
  ELSE
    SELECT COALESCE(SUM(
      COALESCE(p.commission_value, 0) * COALESCE(pp.quantity, 1)
    ), 0)
    INTO _total
    FROM public.proposal_products pp
    JOIN public.products p ON p.id = pp.product_id
    WHERE pp.proposal_id = _proposal_id;
  END IF;

  RETURN _total;
END;
$$;

-- ============================================================
-- 3. Trigger: auto-fill sales.comissao on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_fill_sale_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _computed numeric;
BEGIN
  -- Respect manual override
  IF NEW.comissao IS NOT NULL AND NEW.comissao <> 0 THEN
    RETURN NEW;
  END IF;

  _computed := public.compute_sale_commission(NEW.id);

  -- NULL means: it's an energy proposal, the CPE engine owns this
  IF _computed IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update without recursion (this is AFTER INSERT, so the UPDATE here does
  -- not re-fire the AFTER INSERT trigger).
  UPDATE public.sales SET comissao = _computed WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_fill_sale_commission_insert ON public.sales;
CREATE TRIGGER auto_fill_sale_commission_insert
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_sale_commission();
