-- Operadoras: telecom/energy carriers a product can be sold under.
--
-- An operator only CLASSIFIES a product and, for telecom operators, picks the
-- commission basis (per sale vs monthly accumulated volume) and — when it's
-- monthly volume — whose volume counts (the seller alone, or the whole org).
-- The operator does NOT hold a commission matrix itself: an operator can sell
-- several distinct services (e.g. an energy operator selling electricity AND
-- gas), each needing its own rules, so the matrix stays on the PRODUCT
-- (organizations.servicos_products_config / commission_matrix), same as today.

CREATE TABLE IF NOT EXISTS public.operators (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('telecom', 'energia')),
  -- Only meaningful when kind = 'telecom'.
  commission_basis  text CHECK (commission_basis IN ('per_sale', 'monthly_volume')),
  -- Only meaningful when commission_basis = 'monthly_volume'.
  volume_scope      text CHECK (volume_scope IN ('per_seller', 'org_total')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operators_name_per_org_unique UNIQUE (organization_id, name),
  -- Both fields are telecom-only, and volume_scope only means anything under
  -- monthly_volume — enforce that in the schema, not just in the frontend.
  CONSTRAINT operators_basis_only_telecom CHECK (kind = 'telecom' OR commission_basis IS NULL),
  CONSTRAINT operators_scope_only_monthly_volume CHECK (commission_basis = 'monthly_volume' OR volume_scope IS NULL)
);

COMMENT ON TABLE public.operators IS
  'Telecom/energy carriers (Digi, Vodafone, ...) a catalog product can be linked to. Classifies the product and, for telecom, the commission basis — the commission matrix itself stays on the product.';
COMMENT ON COLUMN public.operators.commission_basis IS
  'per_sale: quantity tier resolved per sale. monthly_volume: quantity tier resolved from the accumulated monthly total (see volume_scope), and past sales in the month are RE-resolved when the total crosses into a new tier.';
COMMENT ON COLUMN public.operators.volume_scope IS
  'per_seller: only that salesperson''s monthly quantity counts. org_total: the whole organization''s monthly quantity counts, so everyone moves up together.';

CREATE INDEX IF NOT EXISTS operators_org_idx ON public.operators (organization_id);

CREATE TRIGGER trg_operators_updated_at
  BEFORE UPDATE ON public.operators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view org operators" ON public.operators;
CREATE POLICY "Members view org operators"
  ON public.operators FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins manage org operators" ON public.operators;
CREATE POLICY "Admins manage org operators"
  ON public.operators FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Super admin full access operators" ON public.operators;
CREATE POLICY "Super admin full access operators"
  ON public.operators FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
