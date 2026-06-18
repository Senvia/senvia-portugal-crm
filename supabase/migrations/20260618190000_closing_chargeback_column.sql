-- Estornos abated at month-close. The closing snapshot now records the
-- chargeback total deducted, and total_commission stores the NET (what is paid):
--   net payable = gross commission − chargebacks of the month.
-- Existing closings get total_chargeback = 0, so their total_commission (gross)
-- already equals the net — no retroactive change.
ALTER TABLE public.commission_closings
  ADD COLUMN IF NOT EXISTS total_chargeback numeric NOT NULL DEFAULT 0;

ALTER TABLE public.commission_closing_items
  ADD COLUMN IF NOT EXISTS total_chargeback numeric NOT NULL DEFAULT 0;
