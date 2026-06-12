-- Unified contact notes: one timeline of notes per contact (keyed by phone),
-- shared by the inbox and the CRM lead/client records. Replaces the single
-- leads.notes / crm_clients.notes text fields. Keyed by phone so a note follows
-- the contact from an unknown inbox conversation through to becoming a
-- lead/client. Chatwoot-independent — works for orgs without the inbox.

create table if not exists public.contact_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone           text not null,          -- normalized digits as captured
  phone_key       text not null,          -- last 9 digits — join key inbox <-> CRM
  content         text not null,
  created_by      uuid references auth.users(id) on delete set null,
  author_name     text,                   -- denormalized for display (no join)
  source          text not null default 'crm',  -- 'inbox' | 'crm' | 'import'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contact_notes_org_phone_idx
  on public.contact_notes (organization_id, phone_key, created_at desc);

alter table public.contact_notes enable row level security;

drop policy if exists "Org members manage contact notes" on public.contact_notes;
create policy "Org members manage contact notes"
  on public.contact_notes for all
  using (public.is_org_member(auth.uid(), organization_id))
  with check (public.is_org_member(auth.uid(), organization_id));

-- One-time migration of existing notes from the old single-field columns.
-- Leads:
insert into public.contact_notes (organization_id, phone, phone_key, content, source, created_at)
select l.organization_id,
       regexp_replace(l.phone, '\D', '', 'g'),
       right(regexp_replace(l.phone, '\D', '', 'g'), 9),
       l.notes,
       'import',
       coalesce(l.created_at, now())
from public.leads l
where l.notes is not null and btrim(l.notes) <> ''
  and l.phone is not null and btrim(l.phone) <> '';

-- Clients (fall back to whatsapp when phone is empty):
insert into public.contact_notes (organization_id, phone, phone_key, content, source, created_at)
select c.organization_id,
       regexp_replace(coalesce(c.phone, c.whatsapp), '\D', '', 'g'),
       right(regexp_replace(coalesce(c.phone, c.whatsapp), '\D', '', 'g'), 9),
       c.notes,
       'import',
       coalesce(c.created_at, now())
from public.crm_clients c
where c.notes is not null and btrim(c.notes) <> ''
  and coalesce(c.phone, c.whatsapp) is not null
  and btrim(coalesce(c.phone, c.whatsapp)) <> '';
