-- Stripe bills a subscription cycle in advance: an invoice charged on the 30th
-- of the month is dated that day but pays for the cycle STARTING that day (the
-- following month, in the customer's own words — "the month 8 fee"). Until now
-- sale_payments only stored the charge date, so a payment for August could be
-- dated July 30 with nothing on the row to say which month it actually covers.
-- Filtering Finance by "August" hid a real, already-recorded payment — read as
-- money going missing.
--
-- These columns let the UI show the period a payment covers, independent of
-- payment_date. Populated by stripe-webhook and reconcile-stripe-payments going
-- forward; NULL for older/manual rows (harmless — the UI falls back to
-- payment_date when absent).

ALTER TABLE public.sale_payments
  ADD COLUMN IF NOT EXISTS billing_period_start date,
  ADD COLUMN IF NOT EXISTS billing_period_end date;

COMMENT ON COLUMN public.sale_payments.billing_period_start IS
  'Start of the subscription cycle this payment covers (Stripe invoice.period_start). NULL for non-subscription/manual payments.';
COMMENT ON COLUMN public.sale_payments.billing_period_end IS
  'End of the subscription cycle this payment covers (Stripe invoice.period_end). NULL for non-subscription/manual payments.';
