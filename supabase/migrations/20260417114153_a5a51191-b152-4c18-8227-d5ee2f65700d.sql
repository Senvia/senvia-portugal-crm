ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS paused_until timestamptz;

COMMENT ON COLUMN public.organization_members.paused_until IS 'Se preenchido e no futuro, o membro é excluído do round-robin automático de leads até essa data.';

CREATE INDEX IF NOT EXISTS idx_organization_members_paused_until
ON public.organization_members(paused_until)
WHERE paused_until IS NOT NULL;