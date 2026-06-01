-- Sales approval workflow.
--
-- Adds audit fields (approved_by / approved_at) on `sales` and tightens RLS so
-- that a salesperson only sees the sales of their own clients/leads (or sales
-- they created). Admins keep full organization visibility, super_admins see
-- everything as before.
--
-- The "approval" itself is just transitioning sales.status to 'delivered':
-- useLiveCommissions already considers status IN ('delivered','fulfilled') the
-- gate for paid commissions. These new fields just record who flipped it and
-- when, so there's a real audit trail.

-- ============================================================
-- 1. Audit fields on sales
-- ============================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

COMMENT ON COLUMN public.sales.approved_by IS
  'User who marked the sale as delivered (installation confirmed). Cleared if reverted.';
COMMENT ON COLUMN public.sales.approved_at IS
  'Timestamp when the sale was marked as delivered. Cleared if reverted.';

-- ============================================================
-- 2. Tighter SELECT policy: per-salesperson visibility
-- ============================================================
-- Admin / super_admin: see all sales of the organization.
-- Everyone else: only sales they created OR whose linked client/lead is
-- assigned to them.
DROP POLICY IF EXISTS "Users view org sales" ON public.sales;

CREATE POLICY "Users view org sales v2" ON public.sales
FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR created_by = auth.uid()
    OR client_id IN (
      SELECT id FROM public.crm_clients WHERE assigned_to = auth.uid()
    )
    OR lead_id IN (
      SELECT id FROM public.leads WHERE assigned_to = auth.uid()
    )
  )
);

-- ============================================================
-- 3. Index for the "pending approval" admin query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sales_org_status
  ON public.sales (organization_id, status);
