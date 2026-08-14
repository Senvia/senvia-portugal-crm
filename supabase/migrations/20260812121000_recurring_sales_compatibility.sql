create or replace function public.ensure_sale_recurrence_from_legacy(
  p_sale_id uuid
)
returns public.sale_recurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales%rowtype;
  v_recurrence public.sale_recurrences%rowtype;
  v_claim_role text;
  v_caller_id uuid;
  v_anchor_date date;
  v_service_status text;
begin
  if p_sale_id is null then
    raise exception using errcode = '23514', message = 'sale is required';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'sale not found';
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
       or not public.is_org_member(v_caller_id, v_sale.organization_id)
     ) then
    raise exception using errcode = '42501', message = 'not authorized for this organization';
  end if;

  select *
  into v_recurrence
  from public.sale_recurrences
  where sale_id = v_sale.id
  order by created_at, id
  limit 1
  for update;

  if found then
    return v_recurrence;
  end if;

  if v_sale.has_recurring is distinct from true then
    return null;
  end if;

  v_anchor_date := coalesce(
    least(
      v_sale.next_renewal_date,
      v_sale.last_renewal_date,
      v_sale.sale_date,
      v_sale.created_at::date
    ),
    date '1970-01-01'
  );

  v_service_status := case
    when v_sale.recurring_status in (
      'pending',
      'active',
      'paused',
      'inactive',
      'cancelled'
    ) then v_sale.recurring_status
    else 'pending'
  end;

  insert into public.sale_recurrences (
    organization_id,
    sale_id,
    amount,
    anchor_date,
    service_status,
    billing_status,
    billing_provider,
    next_cycle_date,
    last_cycle_date,
    paused_at,
    inactive_at,
    cancelled_at,
    created_at,
    updated_at
  ) values (
    v_sale.organization_id,
    v_sale.id,
    case
      when v_sale.recurring_value > 0 then v_sale.recurring_value
      else v_sale.total_value
    end,
    v_anchor_date,
    v_service_status,
    'not_started',
    'manual',
    v_sale.next_renewal_date,
    v_sale.last_renewal_date,
    case when v_service_status = 'paused' then v_sale.updated_at else null end,
    case when v_service_status = 'inactive' then v_sale.updated_at else null end,
    case when v_service_status = 'cancelled' then v_sale.updated_at else null end,
    coalesce(v_sale.created_at, now()),
    coalesce(v_sale.updated_at, v_sale.created_at, now())
  )
  on conflict do nothing
  returning * into v_recurrence;

  if v_recurrence.id is null then
    select *
    into strict v_recurrence
    from public.sale_recurrences
    where sale_id = v_sale.id
    order by created_at, id
    limit 1;
  end if;

  return v_recurrence;
end;
$$;

revoke all on function public.ensure_sale_recurrence_from_legacy(uuid) from public, anon;
grant execute on function public.ensure_sale_recurrence_from_legacy(uuid)
  to authenticated, service_role;

insert into public.sale_recurrences (
  organization_id,
  sale_id,
  amount,
  anchor_date,
  service_status,
  billing_status,
  billing_provider,
  next_cycle_date,
  last_cycle_date,
  paused_at,
  inactive_at,
  cancelled_at,
  created_at,
  updated_at
)
select
  legacy.organization_id,
  legacy.id,
  case
    when legacy.recurring_value > 0 then legacy.recurring_value
    else legacy.total_value
  end,
  coalesce(
    least(
      legacy.next_renewal_date,
      legacy.last_renewal_date,
      legacy.sale_date,
      legacy.created_at::date
    ),
    date '1970-01-01'
  ),
  mapped.service_status,
  'not_started',
  'manual',
  legacy.next_renewal_date,
  legacy.last_renewal_date,
  case when mapped.service_status = 'paused' then legacy.updated_at else null end,
  case when mapped.service_status = 'inactive' then legacy.updated_at else null end,
  case when mapped.service_status = 'cancelled' then legacy.updated_at else null end,
  coalesce(legacy.created_at, now()),
  coalesce(legacy.updated_at, legacy.created_at, now())
from public.sales as legacy
cross join lateral (
  select case
    when legacy.recurring_status in (
      'pending',
      'active',
      'paused',
      'inactive',
      'cancelled'
    ) then legacy.recurring_status
    else 'pending'
  end as service_status
) as mapped
where legacy.has_recurring = true
  and not exists (
    select 1
    from public.sale_recurrences as existing
    where existing.sale_id = legacy.id
  )
on conflict do nothing;

create or replace view public.sales_with_recurrence
with (security_barrier = true)
as
select
  sale.*,
  recurrence.id as recurrence_id,
  recurrence.amount as recurrence_amount,
  recurrence.currency as recurrence_currency,
  recurrence.interval as recurrence_interval,
  recurrence.interval_count as recurrence_interval_count,
  recurrence.anchor_date as recurrence_anchor_date,
  recurrence.service_status,
  recurrence.billing_status,
  recurrence.billing_provider,
  recurrence.next_cycle_date,
  recurrence.last_cycle_date,
  current_cycle.id as current_cycle_id,
  current_cycle.period_start as current_cycle_period_start,
  current_cycle.period_end as current_cycle_period_end,
  current_cycle.due_date as current_cycle_due_date,
  current_cycle.amount as current_cycle_amount,
  current_cycle.status as current_cycle_status,
  (
    sale.has_recurring = true
    and recurrence.service_status in ('pending', 'active', 'paused')
    and sale.next_renewal_date is null
  ) as legacy_date_needs_audit,
  (
    sale.has_recurring = true
    and (
      sale.recurring_status is null
      or sale.recurring_status not in (
        'pending',
        'active',
        'paused',
        'inactive',
        'cancelled'
      )
    )
  ) as legacy_status_needs_audit
from public.sales as sale
left join public.sale_recurrences as recurrence
  on recurrence.sale_id = sale.id
left join lateral (
  select cycle.*
  from public.sale_recurring_cycles as cycle
  where cycle.recurrence_id = recurrence.id
  order by cycle.period_start desc, cycle.id
  limit 1
) as current_cycle on true
where public.is_org_member(auth.uid(), sale.organization_id);

revoke all on public.sales_with_recurrence from public, anon;
grant select on public.sales_with_recurrence to authenticated;
