\set ON_ERROR_STOP on

begin;

do $$
declare
  v_org_id uuid := '10000000-0000-0000-0000-000000000001';
  v_sale_id uuid := '20000000-0000-0000-0000-000000000001';
  v_recurrence_id uuid := '30000000-0000-0000-0000-000000000001';
  v_owner_user_id uuid := '40000000-0000-0000-0000-000000000001';
  v_first_cycle_id uuid;
  v_second_cycle_id uuid;
  v_cycle_count integer;
begin
  -- Given: a monthly recurrence and one billing period.
  insert into public.organizations (id, name, slug)
  values (v_org_id, 'Recurring domain test org', 'recurring-domain-test-org');

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_owner_user_id,
    'authenticated',
    'authenticated',
    'owner@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  insert into public.organization_members (user_id, organization_id, role, is_active)
  values (v_owner_user_id, v_org_id, 'admin', true);

  insert into public.sales (id, organization_id, total_value, status)
  values (v_sale_id, v_org_id, 54.00, 'pending');

  insert into public.sale_recurrences (
    id,
    organization_id,
    sale_id,
    amount,
    anchor_date,
    service_status,
    billing_status,
    billing_provider,
    next_cycle_date
  ) values (
    v_recurrence_id,
    v_org_id,
    v_sale_id,
    54.00,
    date '2026-01-31',
    'active',
    'not_started',
    'manual',
    date '2026-01-31'
  );

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_owner_user_id,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('active_organization_id', v_org_id)
    )::text,
    true
  );

  -- When: the same period is materialized twice.
  select id into v_first_cycle_id
  from public.create_recurring_cycle(v_recurrence_id, date '2026-01-31');

  select id into v_second_cycle_id
  from public.create_recurring_cycle(v_recurrence_id, date '2026-01-31');

  select count(*) into v_cycle_count
  from public.sale_recurring_cycles
  where recurrence_id = v_recurrence_id
    and period_start = date '2026-01-31';

  -- Then: both calls return one stable cycle and only one row exists.
  if v_first_cycle_id is distinct from v_second_cycle_id or v_cycle_count <> 1 then
    raise exception 'idempotency failed: first %, second %, rows %',
      v_first_cycle_id, v_second_cycle_id, v_cycle_count;
  end if;
end;
$$;

do $$
declare
  v_recurrence_id uuid := '30000000-0000-0000-0000-000000000001';
  v_period_starts date[];
  v_last_cycle_date date;
  v_next_cycle_date date;
begin
  -- Given: a January 31 anniversary anchor.
  -- When: February, March and April cycles are created successively.
  perform public.create_recurring_cycle(v_recurrence_id, date '2026-02-28');
  perform public.create_recurring_cycle(v_recurrence_id, date '2026-03-31');
  perform public.create_recurring_cycle(v_recurrence_id, date '2026-04-30');

  select array_agg(period_start order by period_start)
    into v_period_starts
  from public.sale_recurring_cycles
  where recurrence_id = v_recurrence_id
    and period_start >= date '2026-02-01';

  -- Then: short months clamp to month end and the 31st returns afterward.
  if v_period_starts is distinct from array[
    date '2026-02-28',
    date '2026-03-31',
    date '2026-04-30'
  ] then
    raise exception 'anniversary anchoring failed: %', v_period_starts;
  end if;

  -- Given: the recurrence has advanced through April.
  -- When: a stale January request is replayed.
  perform public.create_recurring_cycle(v_recurrence_id, date '2026-01-31');

  select last_cycle_date, next_cycle_date
    into v_last_cycle_date, v_next_cycle_date
  from public.sale_recurrences
  where id = v_recurrence_id;

  -- Then: recurrence pointers do not regress from April and May.
  if v_last_cycle_date is distinct from date '2026-04-30'
     or v_next_cycle_date is distinct from date '2026-05-31' then
    raise exception 'stale replay regressed pointers: last %, next %',
      v_last_cycle_date, v_next_cycle_date;
  end if;
end;
$$;

do $$
declare
  v_recurrence_id uuid := '30000000-0000-0000-0000-000000000001';
  v_service_status text;
  v_billing_status text;
begin
  -- Given: an active service with a billing cycle.
  -- When: that cycle fails.
  update public.sale_recurring_cycles
  set status = 'failed', failure_reason = 'test failure'
  where recurrence_id = v_recurrence_id
    and period_start = date '2026-01-31';

  select service_status, billing_status
    into v_service_status, v_billing_status
  from public.sale_recurrences
  where id = v_recurrence_id;

  -- Then: billing is past due while service remains active.
  if v_service_status is distinct from 'active'
     or v_billing_status is distinct from 'past_due' then
    raise exception 'independent states failed: service %, billing %',
      v_service_status, v_billing_status;
  end if;
end;
$$;

do $$
declare
  v_transition_sale_id uuid := '20000000-0000-0000-0000-000000000002';
  v_recurrence_id uuid := '30000000-0000-0000-0000-000000000002';
  v_cancel_sale_id uuid := '20000000-0000-0000-0000-000000000003';
  v_cancel_recurrence_id uuid := '30000000-0000-0000-0000-000000000003';
  v_cycle_recurrence_id uuid := '30000000-0000-0000-0000-000000000001';
  v_service_status text;
  v_billing_status text;
  v_cancelled_at timestamptz;
begin
  -- Given: an organization member and an existing active recurrence.
  insert into public.sales (id, organization_id, total_value, status)
  values (
    v_transition_sale_id,
    '10000000-0000-0000-0000-000000000001',
    54.00,
    'pending'
  );

  insert into public.sale_recurrences (
    id,
    organization_id,
    sale_id,
    amount,
    anchor_date,
    service_status,
    billing_status,
    billing_provider,
    next_cycle_date
  ) values (
    v_recurrence_id,
    '10000000-0000-0000-0000-000000000001',
    v_transition_sale_id,
    54.00,
    date '2026-01-31',
    'active',
    'past_due',
    'manual',
    date '2026-01-31'
  );

  insert into public.sales (id, organization_id, total_value, status)
  values (
    v_cancel_sale_id,
    '10000000-0000-0000-0000-000000000001',
    54.00,
    'pending'
  );

  insert into public.sale_recurrences (
    id,
    organization_id,
    sale_id,
    amount,
    anchor_date,
    service_status,
    billing_status,
    billing_provider,
    next_cycle_date
  ) values (
    v_cancel_recurrence_id,
    '10000000-0000-0000-0000-000000000001',
    v_cancel_sale_id,
    54.00,
    date '2026-01-31',
    'active',
    'past_due',
    'manual',
    date '2026-01-31'
  );

  execute 'set local role authenticated';

  -- When: an unsupported transition is requested.
  begin
    perform public.transition_sale_recurrence(v_recurrence_id, 'archive');
    raise exception 'malformed transition action was accepted';
  exception
    when check_violation then
      null;
  end;

  -- Given: the same active recurrence and its independent past-due billing state.
  -- When: the service is paused, resumed and deactivated through the RPC.
  perform public.transition_sale_recurrence(v_recurrence_id, 'pause');
  perform public.transition_sale_recurrence(v_recurrence_id, 'resume');
  perform public.transition_sale_recurrence(v_recurrence_id, 'deactivate');

  select service_status, billing_status
    into v_service_status, v_billing_status
  from public.sale_recurrences
  where id = v_recurrence_id;

  -- Then: the service is inactive and billing remains past due.
  if v_service_status is distinct from 'inactive'
     or v_billing_status is distinct from 'past_due' then
    raise exception 'transition state failed: service %, billing %',
      v_service_status, v_billing_status;
  end if;

  begin
    perform public.transition_sale_recurrence(v_recurrence_id, 'resume');
    raise exception 'terminal recurrence was resumed';
  exception
    when check_violation then
      null;
  end;

  -- When: another active recurrence is cancelled.
  perform public.transition_sale_recurrence(v_cancel_recurrence_id, 'cancel');

  select service_status, billing_status, cancelled_at
    into v_service_status, v_billing_status, v_cancelled_at
  from public.sale_recurrences
  where id = v_cancel_recurrence_id;

  -- Then: cancellation is terminal and still does not rewrite billing state.
  if v_service_status is distinct from 'cancelled'
     or v_billing_status is distinct from 'past_due'
     or v_cancelled_at is null then
    raise exception 'cancel transition failed: service %, billing %, cancelled_at %',
      v_service_status, v_billing_status, v_cancelled_at;
  end if;

  begin
    perform public.transition_sale_recurrence(v_cancel_recurrence_id, 'resume');
    raise exception 'cancelled recurrence was resumed';
  exception
    when check_violation then
      null;
  end;

  -- Then: direct invalid status writes are rejected by table constraints.
  begin
    update public.sale_recurrences
    set service_status = 'expired'
    where id = v_recurrence_id;
    raise exception 'invalid service status was accepted';
  exception
    when check_violation then
      null;
  end;

  begin
    update public.sale_recurring_cycles
    set status = 'refunded'
    where recurrence_id = v_cycle_recurrence_id
      and period_start = date '2026-01-31';
    raise exception 'invalid cycle status was accepted';
  exception
    when check_violation then
      null;
  end;

  execute 'reset role';
end;
$$;

do $$
declare
  v_other_user_id uuid := '40000000-0000-0000-0000-000000000002';
  v_other_org_id uuid := '10000000-0000-0000-0000-000000000002';
  v_recurrence_id uuid := '30000000-0000-0000-0000-000000000001';
  v_visible_count integer;
  v_updated_count integer;
begin
  -- Given: two authenticated users in different organizations.
  execute 'reset role';

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_other_user_id,
    'authenticated',
    'authenticated',
    'other@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  insert into public.organizations (id, name, slug)
  values (v_other_org_id, 'Other recurring test org', 'other-recurring-test-org');

  insert into public.organization_members (user_id, organization_id, role, is_active)
  values (v_other_user_id, v_other_org_id, 'admin', true);

  insert into public.stripe_connections (
    organization_id,
    stripe_account_id,
    mode,
    status
  ) values (
    '10000000-0000-0000-0000-000000000001',
    'acct_owner0000000001',
    'test',
    'active'
  );

  -- When: the other tenant reads and updates the owner's recurrence.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_other_user_id,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('active_organization_id', v_other_org_id)
    )::text,
    true
  );
  execute 'set local role authenticated';

  select count(*) into v_visible_count
  from public.sale_recurrences
  where id = v_recurrence_id;

  update public.sale_recurrences
  set amount = 999.00
  where id = v_recurrence_id;
  get diagnostics v_updated_count = row_count;

  begin
    perform public.transition_sale_recurrence(v_recurrence_id, 'pause');
    raise exception 'cross-organization transition was accepted';
  exception
    when insufficient_privilege then
      null;
  end;

  if exists (
    select 1
    from public.stripe_connection_summaries
    where organization_id = '10000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'safe connection summary leaked another organization';
  end if;

  begin
    perform 1 from public.stripe_connections limit 1;
    raise exception 'technical Stripe connection table was client-readable';
  exception
    when insufficient_privilege then
      null;
  end;

  execute 'reset role';

  -- Then: no cross-organization row is visible or mutable.
  if v_visible_count <> 0 or v_updated_count <> 0 then
    raise exception 'RLS isolation failed: visible %, updated %',
      v_visible_count, v_updated_count;
  end if;
end;
$$;

select jsonb_build_object(
  'duplicate_cycle_rows', (
    select count(*)
    from public.sale_recurring_cycles
    where recurrence_id = '30000000-0000-0000-0000-000000000001'
      and period_start = date '2026-01-31'
  ),
  'anchored_period_starts', (
    select jsonb_agg(period_start order by period_start)
    from public.sale_recurring_cycles
    where recurrence_id = '30000000-0000-0000-0000-000000000001'
      and period_start in (
        date '2026-02-28',
        date '2026-03-31',
        date '2026-04-30'
      )
  ),
  'service_status', (
    select service_status
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'billing_status', (
    select billing_status
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'last_cycle_date', (
    select last_cycle_date
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'next_cycle_date', (
    select next_cycle_date
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'cancelled_service_status', (
    select service_status
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000003'
  ),
  'cancelled_billing_status', (
    select billing_status
    from public.sale_recurrences
    where id = '30000000-0000-0000-0000-000000000003'
  )
) as recurring_domain_assertions;

rollback;
