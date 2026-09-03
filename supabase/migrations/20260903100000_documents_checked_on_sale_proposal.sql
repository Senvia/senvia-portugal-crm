-- Simple "Documentos" checkbox on each sale/proposal — true/false, nothing to
-- configure. Replaces the earlier attempt (a text[] of configurable document
-- type keys) from this same migration file: that turned out to be more than
-- what was wanted — a single tick, not a checklist of types.
ALTER TABLE public.sales DROP COLUMN IF EXISTS documents_checked;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS documents_checked;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS documents_checked boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.sales.documents_checked IS
  'Whether the required paperwork for THIS sale has been handed in. Plain yes/no, no configurable list.';

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS documents_checked boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.proposals.documents_checked IS
  'Whether the required paperwork for THIS proposal has been handed in. Plain yes/no, no configurable list.';
