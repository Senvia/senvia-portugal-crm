-- Auditoria do Otto, o assistente do SENVIA OS.
--
-- Vive no Supabase do SENVIA OS (chhmfwlimtbsyjmgtokn), nunca no da Cactus.
-- São dois projectos diferentes e misturá-los é irreversível na prática: dados
-- de clientes do CRM num projecto que não é multi-tenant.
--
-- Tudo escopado por organization_id, com RLS. O Otto de uma organização não
-- pode ver conversas de outra — é a mesma barreira que protege leads e vendas.

-- ── Contactos: um por utilizador que já falou com o Otto ────────────────────
--
-- O campo `presented` é a razão desta tabela existir. A regra é que o Otto se
-- apresenta UMA vez por pessoa, e isso tem de sobreviver a sessões novas, a
-- logout, a outro dispositivo. Guardar isso na memória da conversa significava
-- que ele voltava a dizer "olá, chamo-me Otto" a alguém que fala com ele há
-- meses — exactamente o que a regra proíbe.
create table if not exists public.otto_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  presented boolean not null default false,
  introduced_at timestamptz,
  created_at timestamptz not null default now(),
  -- A mesma pessoa pode pertencer a várias organizações, e nessas é um
  -- interlocutor diferente: a apresentação é por par utilizador+organização.
  constraint otto_contacts_org_user_key unique (organization_id, user_id),
  constraint otto_contacts_introduced_check check (
    presented = false or introduced_at is not null
  )
);

-- ── Sessões de conversa ─────────────────────────────────────────────────────
create table if not exists public.otto_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.otto_contacts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  channel text,
  metadata jsonb not null default '{}'::jsonb,
  constraint otto_sessions_status_check check (status in ('active', 'closed', 'error')),
  constraint otto_sessions_ended_check check (status <> 'active' or ended_at is null)
);

-- ── Mensagens ───────────────────────────────────────────────────────────────
create table if not exists public.otto_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.otto_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now(),
  constraint otto_messages_role_check check (role in ('user', 'assistant'))
);

-- ── Ficheiros enviados ──────────────────────────────────────────────────────
create table if not exists public.otto_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid references public.otto_sessions(id) on delete cascade,
  message_id uuid references public.otto_messages(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  filename text,
  created_at timestamptz not null default now()
);

create index if not exists otto_sessions_org_user_idx
  on public.otto_sessions (organization_id, user_id, started_at desc);
create index if not exists otto_messages_session_idx
  on public.otto_messages (session_id, created_at);
create index if not exists otto_files_session_idx
  on public.otto_files (session_id);

alter table public.otto_contacts enable row level security;
alter table public.otto_sessions enable row level security;
alter table public.otto_messages enable row level security;
alter table public.otto_files  enable row level security;

-- ── Políticas ───────────────────────────────────────────────────────────────
--
-- Leitura restrita ao PRÓPRIO utilizador, não a toda a organização: uma conversa
-- com o assistente é privada de quem a teve. Ser membro da mesma empresa não dá
-- direito a ler o que um colega perguntou ao Otto.
--
-- A escrita fica de fora de propósito. Quem escreve é a Edge Function, e é ela
-- que deriva o organization_id da sessão autenticada. Dar INSERT ao cliente
-- permitia forjar mensagens e falsificar o histórico auditado.

create policy otto_contacts_own_select on public.otto_contacts
  for select to authenticated
  using (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));

create policy otto_sessions_own_select on public.otto_sessions
  for select to authenticated
  using (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));

create policy otto_messages_own_select on public.otto_messages
  for select to authenticated
  using (
    public.is_org_member(auth.uid(), organization_id)
    and exists (
      select 1 from public.otto_sessions s
      where s.id = otto_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy otto_files_own_select on public.otto_files
  for select to authenticated
  using (
    public.is_org_member(auth.uid(), organization_id)
    and exists (
      select 1 from public.otto_sessions s
      where s.id = otto_files.session_id and s.user_id = auth.uid()
    )
  );

comment on table public.otto_contacts is
  'Interlocutores do Otto. `presented` garante que a apresentação acontece uma só vez por pessoa e por organização, mesmo em sessões novas.';
comment on table public.otto_messages is
  'Histórico auditado. Nunca guardar tokens, segredos ou credenciais aqui.';
