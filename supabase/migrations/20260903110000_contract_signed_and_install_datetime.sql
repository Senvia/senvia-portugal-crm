-- 1. "Contrato assinado" checkbox on sale/proposal — same plain true/false
--    pattern as documents_checked, next to it in the form.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS contract_signed boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.sales.contract_signed IS
  'Whether the contract for THIS sale has been signed. Plain yes/no.';

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS contract_signed boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.proposals.contract_signed IS
  'Whether the contract for THIS proposal has been signed. Plain yes/no.';

-- 2. sales.scheduled_install_date gains a time of day — was date-only, now
-- timestamptz so a date+time picker can set both together. Existing dates
-- carry over as midnight in whatever timezone the session used, which is a
-- harmless default (nobody had a time recorded before this).
ALTER TABLE public.sales
  ALTER COLUMN scheduled_install_date TYPE timestamptz
  USING scheduled_install_date::timestamptz;

COMMENT ON COLUMN public.sales.scheduled_install_date IS
  'Booked install date AND time. Optional by design — sales with no date are reported separately ("sem data") instead of being counted into a month.';
