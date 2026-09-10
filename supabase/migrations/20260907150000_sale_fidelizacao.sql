-- ============================================================
-- Fidelização dos contratos telecom (nas vendas, não nos CPEs)
-- ============================================================
-- Uma venda telecom tem sempre uma fidelização (2 anos, tipicamente). A data
-- de fim fica na venda; os alertas (push + email aos admins da org) disparam
-- X e Y dias antes, com X/Y e os canais escolhidos nas definições da org.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS fidelizacao_end date,
  ADD COLUMN IF NOT EXISTS fidelizacao_alert_1_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fidelizacao_alert_2_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sales.fidelizacao_end IS 'End of the contract loyalty period (telecom). Drives the loyalty alerts.';

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS fidelization_sales_alert_days jsonb,
  ADD COLUMN IF NOT EXISTS fidelization_sales_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fidelization_sales_email_enabled boolean NOT NULL DEFAULT true;

-- organizations has column-level SELECT grants: a new column is invisible to
-- the app (403 on the whole fetch) until granted like its siblings.
GRANT SELECT (fidelization_sales_alert_days, fidelization_sales_push_enabled, fidelization_sales_email_enabled)
  ON public.organizations TO authenticated, anon;

CREATE INDEX IF NOT EXISTS sales_fidelizacao_end_idx ON public.sales (organization_id, fidelizacao_end)
  WHERE fidelizacao_end IS NOT NULL;

NOTIFY pgrst, 'reload schema';
