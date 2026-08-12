alter table public.sales
  add constraint recurring_sales_sale_org_key unique (id, organization_id);

alter table public.products
  add constraint recurring_sales_product_org_key unique (id, organization_id);

create table public.stripe_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_account_id text not null,
  mode text not null,
  status text not null default 'active',
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_connections_organization_key unique (organization_id),
  constraint stripe_connections_id_org_key unique (id, organization_id),
  constraint stripe_connections_account_org_key unique (stripe_account_id, organization_id),
  constraint stripe_connections_account_key unique (stripe_account_id),
  constraint stripe_connections_account_check check (stripe_account_id like 'acct\_%' escape '\'),
  constraint stripe_connections_mode_check check (mode in ('test', 'live')),
  constraint stripe_connections_status_check check (
    status in ('active', 'restricted', 'disconnected', 'error')
  ),
  constraint stripe_connections_disconnected_check check (
    status = 'disconnected' or disconnected_at is null
  )
);

create table public.stripe_product_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null,
  stripe_connection_id uuid not null,
  stripe_product_id text not null,
  stripe_price_id text not null,
  currency text not null default 'EUR',
  unit_amount bigint not null,
  interval text not null default 'month',
  interval_count integer not null default 1,
  active boolean not null default true,
  synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_product_mappings_product_fkey
    foreign key (product_id, organization_id)
    references public.products(id, organization_id) on delete cascade,
  constraint stripe_product_mappings_connection_fkey
    foreign key (stripe_connection_id, organization_id)
    references public.stripe_connections(id, organization_id) on delete restrict,
  constraint stripe_product_mappings_org_product_key unique (organization_id, product_id),
  constraint stripe_product_mappings_product_key unique (stripe_connection_id, stripe_product_id),
  constraint stripe_product_mappings_price_key unique (stripe_connection_id, stripe_price_id),
  constraint stripe_product_mappings_product_check check (stripe_product_id like 'prod\_%' escape '\'),
  constraint stripe_product_mappings_price_check check (stripe_price_id like 'price\_%' escape '\'),
  constraint stripe_product_mappings_currency_check check (currency = 'EUR'),
  constraint stripe_product_mappings_amount_check check (unit_amount > 0),
  constraint stripe_product_mappings_interval_check check (interval = 'month'),
  constraint stripe_product_mappings_interval_count_check check (interval_count = 1)
);

create table public.sale_recurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sale_id uuid not null,
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  interval text not null default 'month',
  interval_count integer not null default 1,
  anchor_date date not null,
  service_status text not null default 'pending',
  billing_status text not null default 'not_started',
  billing_provider text not null default 'manual',
  next_cycle_date date,
  last_cycle_date date,
  paused_at timestamptz,
  inactive_at timestamptz,
  cancelled_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_recurrences_sale_fkey
    foreign key (sale_id, organization_id)
    references public.sales(id, organization_id) on delete cascade,
  constraint sale_recurrences_identity_key unique (id, sale_id, organization_id),
  constraint sale_recurrences_id_org_key unique (id, organization_id),
  constraint sale_recurrences_subscription_key unique (stripe_subscription_id),
  constraint sale_recurrences_checkout_key unique (stripe_checkout_session_id),
  constraint sale_recurrences_amount_check check (amount > 0),
  constraint sale_recurrences_currency_check check (currency = 'EUR'),
  constraint sale_recurrences_interval_check check (interval = 'month'),
  constraint sale_recurrences_interval_count_check check (interval_count = 1),
  constraint sale_recurrences_service_status_check check (
    service_status in ('pending', 'active', 'paused', 'inactive', 'cancelled')
  ),
  constraint sale_recurrences_billing_status_check check (
    billing_status in ('not_started', 'current', 'past_due', 'uncollectible')
  ),
  constraint sale_recurrences_billing_provider_check check (
    billing_provider in ('manual', 'stripe')
  ),
  constraint sale_recurrences_next_cycle_check check (
    next_cycle_date is null or next_cycle_date >= anchor_date
  ),
  constraint sale_recurrences_last_cycle_check check (
    last_cycle_date is null or last_cycle_date >= anchor_date
  ),
  constraint sale_recurrences_customer_check check (
    stripe_customer_id is null or stripe_customer_id like 'cus\_%' escape '\'
  ),
  constraint sale_recurrences_subscription_check check (
    stripe_subscription_id is null or stripe_subscription_id like 'sub\_%' escape '\'
  ),
  constraint sale_recurrences_checkout_check check (
    stripe_checkout_session_id is null or stripe_checkout_session_id like 'cs\_%' escape '\'
  )
);

create unique index sale_recurrences_one_open_per_sale_idx
  on public.sale_recurrences (sale_id)
  where service_status in ('pending', 'active', 'paused');

create table public.sale_recurring_cycles (
  id uuid primary key default gen_random_uuid(),
  recurrence_id uuid not null,
  sale_id uuid not null,
  organization_id uuid not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  status text not null default 'pending',
  stripe_invoice_id text,
  stripe_invoice_status text,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_recurring_cycles_recurrence_fkey
    foreign key (recurrence_id, sale_id, organization_id)
    references public.sale_recurrences(id, sale_id, organization_id) on delete cascade,
  constraint sale_recurring_cycles_sale_fkey
    foreign key (sale_id, organization_id)
    references public.sales(id, organization_id) on delete cascade,
  constraint sale_recurring_cycles_identity_key unique (id, sale_id, organization_id),
  constraint sale_recurring_cycles_period_key unique (recurrence_id, period_start, period_end),
  constraint sale_recurring_cycles_invoice_key unique (stripe_invoice_id),
  constraint sale_recurring_cycles_period_check check (period_end >= period_start),
  constraint sale_recurring_cycles_due_date_check check (
    due_date >= period_start and due_date <= period_end
  ),
  constraint sale_recurring_cycles_amount_check check (amount > 0),
  constraint sale_recurring_cycles_currency_check check (currency = 'EUR'),
  constraint sale_recurring_cycles_status_check check (
    status in ('pending', 'paid', 'failed', 'void')
  ),
  constraint sale_recurring_cycles_invoice_check check (
    stripe_invoice_id is null or stripe_invoice_id like 'in\_%' escape '\'
  ),
  constraint sale_recurring_cycles_paid_at_check check (
    status = 'paid' or paid_at is null
  )
);

create table public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  stripe_account_id text not null,
  organization_id uuid not null,
  event_type text not null,
  livemode boolean not null,
  status text not null default 'processing',
  attempts integer not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint stripe_events_event_key unique (stripe_event_id),
  constraint stripe_events_connection_fkey
    foreign key (stripe_account_id, organization_id)
    references public.stripe_connections(stripe_account_id, organization_id) on delete restrict,
  constraint stripe_events_event_check check (stripe_event_id like 'evt\_%' escape '\'),
  constraint stripe_events_account_check check (stripe_account_id like 'acct\_%' escape '\'),
  constraint stripe_events_type_check check (length(btrim(event_type)) > 0),
  constraint stripe_events_status_check check (
    status in ('processing', 'processed', 'failed', 'ignored')
  ),
  constraint stripe_events_attempts_check check (attempts > 0),
  constraint stripe_events_processed_at_check check (
    status in ('processing', 'failed') or processed_at is not null
  )
);

alter table public.sale_payments
  add column recurring_cycle_id uuid,
  add column stripe_gross_amount numeric(12, 2),
  add column stripe_fee_amount numeric(12, 2),
  add column stripe_net_amount numeric(12, 2),
  add constraint sale_payments_recurring_cycle_fkey
    foreign key (recurring_cycle_id, sale_id, organization_id)
    references public.sale_recurring_cycles(id, sale_id, organization_id) on delete restrict,
  add constraint sale_payments_stripe_gross_check check (
    stripe_gross_amount is null or stripe_gross_amount >= 0
  ),
  add constraint sale_payments_stripe_fee_check check (
    stripe_fee_amount is null or stripe_fee_amount >= 0
  ),
  add constraint sale_payments_stripe_net_check check (
    stripe_net_amount is null or stripe_net_amount >= 0
  ),
  add constraint sale_payments_stripe_fee_gross_check check (
    stripe_gross_amount is null
    or stripe_fee_amount is null
    or stripe_fee_amount <= stripe_gross_amount
  ),
  add constraint sale_payments_stripe_net_gross_check check (
    stripe_gross_amount is null
    or stripe_net_amount is null
    or stripe_net_amount <= stripe_gross_amount
  );

create unique index sale_payments_recurring_cycle_idx
  on public.sale_payments (recurring_cycle_id)
  where recurring_cycle_id is not null;

create index stripe_connections_status_idx
  on public.stripe_connections (status);
create index stripe_product_mappings_connection_idx
  on public.stripe_product_mappings (stripe_connection_id, active);
create index sale_recurrences_org_status_idx
  on public.sale_recurrences (organization_id, service_status, billing_status);
create index sale_recurrences_next_cycle_idx
  on public.sale_recurrences (next_cycle_date)
  where service_status = 'active';
create index sale_recurring_cycles_org_period_idx
  on public.sale_recurring_cycles (organization_id, period_start);
create index sale_recurring_cycles_recurrence_status_idx
  on public.sale_recurring_cycles (recurrence_id, status);
create index sale_recurring_cycles_due_idx
  on public.sale_recurring_cycles (due_date)
  where status in ('pending', 'failed');
create index stripe_events_processing_idx
  on public.stripe_events (status, received_at);
create index stripe_events_org_account_idx
  on public.stripe_events (organization_id, stripe_account_id);

alter table public.stripe_connections enable row level security;
alter table public.stripe_product_mappings enable row level security;
alter table public.sale_recurrences enable row level security;
alter table public.sale_recurring_cycles enable row level security;
alter table public.stripe_events enable row level security;

create policy stripe_product_mappings_member_select
on public.stripe_product_mappings
for select
to authenticated
using (public.is_org_member(auth.uid(), organization_id));

create policy sale_recurrences_member_select
on public.sale_recurrences
for select
to authenticated
using (public.is_org_member(auth.uid(), organization_id));

create policy sale_recurring_cycles_member_select
on public.sale_recurring_cycles
for select
to authenticated
using (public.is_org_member(auth.uid(), organization_id));

revoke all on public.stripe_connections from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke all on public.sale_recurrences from anon, authenticated;
revoke all on public.sale_recurring_cycles from anon, authenticated;
grant all on public.stripe_connections to service_role;
grant select on public.stripe_product_mappings to authenticated;
grant all on public.stripe_product_mappings to service_role;
grant select on public.sale_recurrences to authenticated;
grant all on public.sale_recurrences to service_role;
grant select on public.sale_recurring_cycles to authenticated;
grant all on public.sale_recurring_cycles to service_role;
grant all on public.stripe_events to service_role;

create view public.stripe_connection_summaries
with (security_barrier = true)
as
select
  id,
  organization_id,
  mode,
  status,
  charges_enabled,
  details_submitted,
  left(stripe_account_id, 5) || '...' || right(stripe_account_id, 4) as masked_account_id,
  connected_at,
  disconnected_at,
  updated_at
from public.stripe_connections
where public.is_org_member(auth.uid(), organization_id);

revoke all on public.stripe_connection_summaries from anon;
grant select on public.stripe_connection_summaries to authenticated, service_role;

create trigger update_stripe_connections_updated_at
before update on public.stripe_connections
for each row execute function public.update_updated_at_column();

create trigger update_stripe_product_mappings_updated_at
before update on public.stripe_product_mappings
for each row execute function public.update_updated_at_column();

create trigger update_sale_recurrences_updated_at
before update on public.sale_recurrences
for each row execute function public.update_updated_at_column();

create trigger update_sale_recurring_cycles_updated_at
before update on public.sale_recurring_cycles
for each row execute function public.update_updated_at_column();

create or replace function public.refresh_sale_recurrence_billing_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recurrence_id uuid;
begin
  if tg_op = 'DELETE' then
    v_recurrence_id := old.recurrence_id;
  else
    v_recurrence_id := new.recurrence_id;
  end if;

  update public.sale_recurrences as recurrence
  set billing_status = case
    when recurrence.billing_status = 'uncollectible' then 'uncollectible'
    when exists (
      select 1
      from public.sale_recurring_cycles as cycle
      where cycle.recurrence_id = v_recurrence_id
        and (
          cycle.status = 'failed'
          or (cycle.status = 'pending' and cycle.due_date < current_date)
        )
    ) then 'past_due'
    when exists (
      select 1
      from public.sale_recurring_cycles as cycle
      where cycle.recurrence_id = v_recurrence_id
        and cycle.status <> 'void'
    ) then 'current'
    else 'not_started'
  end
  where recurrence.id = v_recurrence_id;

  return null;
end;
$$;

revoke all on function public.refresh_sale_recurrence_billing_status() from public;

create trigger refresh_sale_recurrence_billing_status
after insert or update or delete on public.sale_recurring_cycles
for each row execute function public.refresh_sale_recurrence_billing_status();

create or replace function public.create_recurring_cycle(
  p_recurrence_id uuid,
  p_period_start date
)
returns public.sale_recurring_cycles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recurrence public.sale_recurrences%rowtype;
  v_cycle public.sale_recurring_cycles%rowtype;
  v_period_month date;
  v_period_start date;
  v_next_month date;
  v_next_cycle_date date;
  v_claim_role text;
  v_caller_id uuid;
begin
  if p_recurrence_id is null or p_period_start is null then
    raise exception using errcode = '23514', message = 'recurrence and period start are required';
  end if;

  select *
  into v_recurrence
  from public.sale_recurrences
  where id = p_recurrence_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'sale recurrence not found';
  end if;

  begin
    v_claim_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    v_claim_role := null;
  end;

  v_caller_id := auth.uid();

  if v_claim_role is distinct from 'service_role'
     and (
       v_caller_id is null
       or not public.is_org_member(v_caller_id, v_recurrence.organization_id)
     ) then
    raise exception using errcode = '42501', message = 'not authorized for this organization';
  end if;

  v_period_month := date_trunc('month', p_period_start)::date;
  v_period_start := make_date(
    extract(year from v_period_month)::integer,
    extract(month from v_period_month)::integer,
    least(
      extract(day from v_recurrence.anchor_date)::integer,
      extract(day from (v_period_month + interval '1 month - 1 day'))::integer
    )
  );

  if v_period_start < v_recurrence.anchor_date then
    raise exception using errcode = '23514', message = 'period start precedes recurrence anchor';
  end if;

  v_next_month := (
    v_period_month + make_interval(months => v_recurrence.interval_count)
  )::date;
  v_next_cycle_date := make_date(
    extract(year from v_next_month)::integer,
    extract(month from v_next_month)::integer,
    least(
      extract(day from v_recurrence.anchor_date)::integer,
      extract(day from (v_next_month + interval '1 month - 1 day'))::integer
    )
  );

  select *
  into v_cycle
  from public.sale_recurring_cycles
  where recurrence_id = v_recurrence.id
    and period_start = v_period_start
    and period_end = v_next_cycle_date - 1;

  if found then
    return v_cycle;
  end if;

  if v_recurrence.service_status not in ('pending', 'active') then
    raise exception using errcode = '23514', message = 'recurrence state cannot generate cycles';
  end if;

  if v_recurrence.next_cycle_date is null
     or v_period_start is distinct from v_recurrence.next_cycle_date then
    raise exception using errcode = '23514', message = 'period start must match the next cycle date';
  end if;

  insert into public.sale_recurring_cycles (
    recurrence_id,
    sale_id,
    organization_id,
    period_start,
    period_end,
    due_date,
    amount,
    currency
  ) values (
    v_recurrence.id,
    v_recurrence.sale_id,
    v_recurrence.organization_id,
    v_period_start,
    v_next_cycle_date - 1,
    v_period_start,
    v_recurrence.amount,
    v_recurrence.currency
  )
  on conflict (recurrence_id, period_start, period_end) do nothing;

  select *
  into strict v_cycle
  from public.sale_recurring_cycles
  where recurrence_id = v_recurrence.id
    and period_start = v_period_start
    and period_end = v_next_cycle_date - 1;

  update public.sale_recurrences
  set
    last_cycle_date = case
      when last_cycle_date is null or v_period_start > last_cycle_date then v_period_start
      else last_cycle_date
    end,
    next_cycle_date = case
      when last_cycle_date is null or v_period_start >= last_cycle_date then v_next_cycle_date
      else next_cycle_date
    end
  where id = v_recurrence.id;

  return v_cycle;
end;
$$;

revoke all on function public.create_recurring_cycle(uuid, date) from public;
grant execute on function public.create_recurring_cycle(uuid, date) to authenticated, service_role;

create or replace function public.transition_sale_recurrence(
  p_recurrence_id uuid,
  p_action text
)
returns public.sale_recurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recurrence public.sale_recurrences%rowtype;
  v_claim_role text;
  v_caller_id uuid;
begin
  if p_recurrence_id is null or p_action is null then
    raise exception using errcode = '23514', message = 'recurrence and action are required';
  end if;

  select *
  into v_recurrence
  from public.sale_recurrences
  where id = p_recurrence_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'sale recurrence not found';
  end if;

  begin
    v_claim_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    v_claim_role := null;
  end;

  v_caller_id := auth.uid();

  if v_claim_role is distinct from 'service_role'
     and (
       v_caller_id is null
       or not public.is_org_member(v_caller_id, v_recurrence.organization_id)
     ) then
    raise exception using errcode = '42501', message = 'not authorized for this organization';
  end if;

  if p_action not in ('pause', 'resume', 'deactivate', 'cancel') then
    raise exception using errcode = '23514', message = 'unsupported recurrence action';
  end if;

  if p_action = 'pause' and v_recurrence.service_status = 'active' then
    update public.sale_recurrences
    set service_status = 'paused', paused_at = now()
    where id = p_recurrence_id
    returning * into v_recurrence;
  elsif p_action = 'resume' and v_recurrence.service_status = 'paused' then
    update public.sale_recurrences
    set service_status = 'active', paused_at = null
    where id = p_recurrence_id
    returning * into v_recurrence;
  elsif p_action = 'deactivate'
        and v_recurrence.service_status in ('active', 'paused') then
    update public.sale_recurrences
    set service_status = 'inactive', inactive_at = now()
    where id = p_recurrence_id
    returning * into v_recurrence;
  elsif p_action = 'cancel'
        and v_recurrence.service_status in ('pending', 'active', 'paused') then
    update public.sale_recurrences
    set service_status = 'cancelled', cancelled_at = now()
    where id = p_recurrence_id
    returning * into v_recurrence;
  else
    raise exception using errcode = '23514', message = 'illegal recurrence transition';
  end if;

  return v_recurrence;
end;
$$;

revoke all on function public.transition_sale_recurrence(uuid, text) from public;
grant execute on function public.transition_sale_recurrence(uuid, text) to authenticated, service_role;
