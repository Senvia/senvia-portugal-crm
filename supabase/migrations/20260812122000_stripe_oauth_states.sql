-- Estado de uso único do OAuth do Stripe Connect.
--
-- O `state` do OAuth é a única defesa contra CSRF no retorno do Stripe: sem ele,
-- qualquer pessoa pode induzir um administrador a abrir o callback e ligar uma
-- conta Stripe que não é a dele à organização — ou pior, ligar a conta da vítima
-- à organização do atacante. Por isso o valor é gerado por nós, tem de voltar
-- exatamente igual, e só pode ser usado UMA vez.
--
-- Guardamos apenas o SHA-256 do valor, nunca o valor em claro. Se esta tabela
-- vazar, o conteúdo não serve para forjar um callback. É o mesmo raciocínio de
-- não guardar passwords em claro.
--
-- Sem políticas de RLS de propósito: a tabela tem RLS ligada e nenhuma policy,
-- portanto nenhum cliente autenticado lhe toca. Só as edge functions, que usam
-- a service role, a leem e escrevem.

create table public.stripe_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  redirect_path text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint stripe_oauth_states_hash_key unique (state_hash),
  constraint stripe_oauth_states_mode_check check (mode in ('test', 'live')),
  -- SHA-256 em hexadecimal: 64 caracteres. Recusa qualquer coisa que não seja
  -- um digest, o que apanha o erro de alguém gravar aqui o valor em claro.
  constraint stripe_oauth_states_hash_check check (state_hash ~ '^[0-9a-f]{64}$'),
  constraint stripe_oauth_states_expiry_check check (expires_at > created_at)
);

create index stripe_oauth_states_expiry_idx
  on public.stripe_oauth_states (expires_at)
  where consumed_at is null;

alter table public.stripe_oauth_states enable row level security;

-- Consome o state de forma atómica.
--
-- O UPDATE ... WHERE consumed_at is null é o que torna o uso único real: se dois
-- pedidos chegarem ao mesmo tempo com o mesmo state, o Postgres serializa-os e
-- só o primeiro encontra a linha por consumir. O segundo não devolve nada. Uma
-- verificação em dois passos (SELECT e depois UPDATE) deixaria essa janela
-- aberta e o state deixaria de ser de uso único.
create or replace function public.consume_stripe_oauth_state(_state_hash text)
returns table (
  organization_id uuid,
  user_id uuid,
  mode text,
  redirect_path text
)
language sql
volatile
security definer
set search_path to 'public'
as $$
  update public.stripe_oauth_states s
  set consumed_at = now()
  where s.state_hash = _state_hash
    and s.consumed_at is null
    and s.expires_at > now()
  returning s.organization_id, s.user_id, s.mode, s.redirect_path;
$$;

revoke execute on function public.consume_stripe_oauth_state(text) from public, anon, authenticated;

-- Limpeza dos states que nunca foram usados. Não é crítico para a segurança
-- (expirados já não são aceites), é apenas higiene da tabela.
create or replace function public.purge_stripe_oauth_states()
returns integer
language sql
volatile
security definer
set search_path to 'public'
as $$
  with removed as (
    delete from public.stripe_oauth_states
    where expires_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke execute on function public.purge_stripe_oauth_states() from public, anon, authenticated;
