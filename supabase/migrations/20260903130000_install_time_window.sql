-- Installs are booked as a WINDOW ("das 9h às 12h"), not a single time.
-- scheduled_install_date stays the start of that window — every dashboard
-- count, filter and index that already reads it keeps working untouched —
-- and this adds the end of it. NULL end = no window agreed, just a start.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS scheduled_install_end timestamptz;

COMMENT ON COLUMN public.sales.scheduled_install_end IS
  'End of the booked install window. scheduled_install_date is the start; NULL here means only a start time was agreed.';
