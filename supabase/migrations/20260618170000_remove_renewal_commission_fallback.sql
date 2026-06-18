-- Remove the silent 0.25 fallback for telecom renewal commissions.
--
-- Before: a renewal product with no commission_renewal_value silently earned
-- 25% of its base commission_value. That hidden default should not exist: the
-- renewal commission must be set explicitly on the product. Now a missing
-- renewal value yields 0 (and the product UI requires it whenever a base
-- commission is set).
--
-- Only the renewal branch changes; everything else is identical to the current
-- compute_sale_commission.
CREATE OR REPLACE FUNCTION public.compute_sale_commission(p_sale_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _proposal_id uuid;
  _neg_type text;
  _has_cpes boolean;
  _total numeric := 0;
  _org_id uuid;
  _sale_total numeric := 0;
  _niche text;
  _mode text;
  _pct numeric;
BEGIN
  SELECT proposal_id, organization_id, COALESCE(total_value, 0)
    INTO _proposal_id, _org_id, _sale_total
  FROM public.sales WHERE id = p_sale_id;

  -- Energy proposals (with CPEs) are handled by useLiveCommissions
  IF _proposal_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.proposal_cpes WHERE proposal_id = _proposal_id) INTO _has_cpes;
    IF _has_cpes THEN RETURN NULL; END IF;
  END IF;

  -- Non-telecom orgs use a configurable commission mode (global % or per-product).
  SELECT niche,
         sales_settings->>'commission_mode',
         NULLIF(sales_settings->>'commission_percentage', '')::numeric
    INTO _niche, _mode, _pct
  FROM public.organizations WHERE id = _org_id;

  IF COALESCE(_niche, '') <> 'telecom' THEN
    IF _mode IS NULL OR _mode = '' THEN
      _mode := CASE WHEN COALESCE(_pct, 0) > 0 THEN 'global' ELSE 'per_product' END;
    END IF;
    IF _mode = 'global' THEN
      RETURN ROUND(_sale_total * COALESCE(_pct, 0) / 100.0, 2);
    END IF;
  END IF;

  IF _proposal_id IS NULL THEN RETURN 0; END IF;

  SELECT negotiation_type INTO _neg_type FROM public.proposals WHERE id = _proposal_id;

  IF _neg_type = 'renovacao' THEN
    -- No silent fallback: renewal commission must be set explicitly. Missing = 0.
    SELECT COALESCE(SUM(
      COALESCE(p.commission_renewal_value, 0)
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
$function$;
