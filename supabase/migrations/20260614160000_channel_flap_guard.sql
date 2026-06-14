-- Flap guard: a dead WhatsApp session (Baileys 428 loop) reconnects ~1/sec and
-- floods Chatwoot with "Connection established" status messages, which once
-- saturated the whole Chatwoot server. These columns + RPC let chatwoot-webhook
-- count status messages per channel in a sliding window and trip a brake when a
-- single channel goes runaway, so one broken session can never again take the
-- server down. needs_repair is cleared on the next successful (re)connect.

alter table public.messaging_channels
  add column if not exists flap_count integer not null default 0,
  add column if not exists flap_window_start timestamptz,
  add column if not exists needs_repair boolean not null default false;

-- Atomically record one status message for a channel within a sliding window and
-- report whether the runaway threshold was reached. On trip it resets the counter
-- and flags the channel disconnected + needs_repair (so the caller stops it at the
-- source and the UI/poll reflect it). SECURITY DEFINER + row lock avoid races
-- across concurrent webhook invocations.
create or replace function public.bump_channel_flap(
  p_channel_id uuid,
  p_window_seconds integer,
  p_threshold integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  select flap_count, flap_window_start
    into v_count, v_start
    from public.messaging_channels
   where id = p_channel_id
   for update;
  if not found then
    return false;
  end if;

  -- New window (first event, or the previous window has expired).
  if v_start is null or now() - v_start > make_interval(secs => p_window_seconds) then
    update public.messaging_channels
       set flap_count = 1, flap_window_start = now()
     where id = p_channel_id;
    return false;
  end if;

  v_count := coalesce(v_count, 0) + 1;
  if v_count >= p_threshold then
    -- Runaway confirmed: trip the brake. Reset the window and flag the channel.
    update public.messaging_channels
       set flap_count = 0,
           flap_window_start = null,
           status = 'disconnected',
           needs_repair = true
     where id = p_channel_id;
    return true;
  end if;

  update public.messaging_channels
     set flap_count = v_count
   where id = p_channel_id;
  return false;
end;
$$;

revoke all on function public.bump_channel_flap(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_channel_flap(uuid, integer, integer) to service_role;
