-- Soft-archive para leads: alivia a carga em orgs com muitos leads.
-- As vistas/contagens normais passam a filtrar archived_at IS NULL.
-- Reversível (restaurar = archived_at = null). Sem RLS nova (as policies de
-- leads já cobrem; é apenas uma coluna).

alter table public.leads
  add column if not exists archived_at timestamptz;

comment on column public.leads.archived_at is
  'Quando preenchido, o lead está arquivado: excluído das vistas/contagens normais. NULL = ativo.';

create index if not exists idx_leads_org_archived
  on public.leads (organization_id, archived_at);
