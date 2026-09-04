ALTER TABLE public.monthly_commitments
  ADD COLUMN IF NOT EXISTS total_instalacoes numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.monthly_commitments.total_instalacoes IS
  'Monthly installation target — telecom only. How many installs this person committed to for the month.';
