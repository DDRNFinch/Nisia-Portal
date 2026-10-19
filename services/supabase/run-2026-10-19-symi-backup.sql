-- Symi on every device: the tutor's own learners, registers, classes, finished registers and marks, kept with their
-- Evia Portal account so their phone and laptop show the same. Each device merges what's here with its own (the newest
-- change to each learner, register and finished register wins) and puts the result back.
--   symi_backups        one row per tutor; only they can read or change it, through the two actions below
--   symi_backup_get     what's kept, unless it hasn't changed since the time the device last saw
--   symi_backup_put     keep this (up to 5 MB)
-- Only adds: nothing already stored changes.

create table if not exists public.symi_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.symi_backups enable row level security;
revoke all on public.symi_backups from anon, authenticated;

create or replace function public.symi_backup_get(p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.symi_backups;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia Portal first.'; end if;
  select * into v from public.symi_backups where user_id = auth.uid();
  if v.user_id is null then return null; end if;
  if p_since is not null and v.updated_at <= p_since then return jsonb_build_object('updated_at', v.updated_at, 'same', true); end if;
  return jsonb_build_object('updated_at', v.updated_at, 'state', v.state);
end $$;

create or replace function public.symi_backup_put(p_state jsonb) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sign in to Evia Portal first.'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'That isn’t a Symi backup.'; end if;
  if octet_length(p_state::text) > 5 * 1024 * 1024 then raise exception 'Symi’s registers are too big to keep (over 5 MB).'; end if;
  insert into public.symi_backups (user_id, state, updated_at) values (auth.uid(), p_state, v_at)
  on conflict (user_id) do update set state = excluded.state, updated_at = excluded.updated_at;
  return v_at;
end $$;

revoke all on function public.symi_backup_get(timestamptz) from public, anon;
revoke all on function public.symi_backup_put(jsonb) from public, anon;
grant execute on function public.symi_backup_get(timestamptz) to authenticated;
grant execute on function public.symi_backup_put(jsonb) to authenticated;

-- The college server's clock, so Symi's changing check-in code follows it rather than the device's own clock
-- (a classroom laptop half a minute out made every code look "changed" to Evia Portal).
create or replace function public.nisia_now() returns timestamptz language sql stable set search_path = '' as $$ select clock_timestamp() $$;
revoke all on function public.nisia_now() from public, anon;
grant execute on function public.nisia_now() to authenticated;
