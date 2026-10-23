-- Careers sessions: things the college runs that help apprentices with their next steps (a Level 3 open evening, an
-- SSSTS course, a careers fair, an employer visit). Staff add them in Evia Portal and pick which goals each one suits;
-- learners see them in Evia's My future (the ones that suit their goal first) and on their calendar, and tap
-- "I'm interested". Staff see who's interested. Taking one down cancels it.
--
--   nisia_careers           a college's sessions, with who's interested (its staff)
--   nisia_careers_save      add one, or change one (p_id)
--   nisia_careers_cancel    take one down
--   evia_careers            the learner's college's sessions coming up, and whether they're interested
--   evia_careers_interest   the learner says they're interested (or not any more)

create table if not exists public.careers_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  starts_at timestamptz not null,
  minutes int not null default 60 check (minutes between 15 and 600),
  place text check (length(place) <= 200),
  details text check (length(details) <= 1500),
  link text check (length(link) <= 2000),
  goals text[] not null default '{}',
  added_by_member_id uuid references public.organisation_members(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists careers_sessions_org on public.careers_sessions (organisation_id, starts_at);
create table if not exists public.careers_interest (
  session_id uuid not null references public.careers_sessions(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (session_id, enrolment_id)
);
-- No direct access: everything goes through the functions below.
alter table public.careers_sessions enable row level security;
alter table public.careers_interest enable row level security;
revoke all on public.careers_sessions, public.careers_interest from anon, authenticated;

create or replace function private.careers_staff(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and (private.has_role(p_org, 'tutor') or private.has_role(p_org, 'assessor') or private.has_role(p_org, 'quality') or private.can_manage_org(p_org));
$$;

create or replace function public.nisia_careers(p_org uuid) returns table (
  id uuid, title text, starts_at timestamptz, minutes int, place text, details text, link text, goals text[], added_by text, interested jsonb)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.starts_at, s.minutes, s.place, s.details, s.link, s.goals, coalesce(p.display_name, ''),
    coalesce((select jsonb_agg(private.enrolment_name(i.enrolment_id) order by i.at) from public.careers_interest i where i.session_id = s.id), '[]'::jsonb)
  from public.careers_sessions s
  left join public.organisation_members m on m.id = s.added_by_member_id
  left join public.profiles p on p.id = m.user_id
  where s.organisation_id = p_org and s.cancelled_at is null and s.starts_at > now() - interval '60 days' and private.careers_staff(p_org)
  order by s.starts_at limit 300;
$$;

create or replace function public.nisia_careers_save(p_org uuid, p_title text, p_starts_at timestamptz, p_minutes int default 60,
  p_place text default null, p_details text default null, p_link text default null, p_goals text[] default '{}', p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_goals text[];
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'Sign in to Evia Portal with your authenticator app first.'; end if;
  if not private.careers_staff(p_org) then raise exception 'Only the college’s staff can add careers sessions.'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'Give the session a name.'; end if;
  if p_starts_at is null then raise exception 'Choose a day and time.'; end if;
  if p_starts_at < now() - interval '1 day' then raise exception 'That day has already gone.'; end if;
  if nullif(trim(coalesce(p_link, '')), '') is not null and p_link !~* '^https?://' then raise exception 'Links start with https://'; end if;
  select coalesce(array_agg(distinct g), '{}') into v_goals from unnest(coalesce(p_goals, '{}')) g
    where g in ('qualified', 'level3', 'supervisor', 'business', 'specialist', 'teach');
  if p_id is not null then
    update public.careers_sessions set title = left(trim(p_title), 160), starts_at = p_starts_at, minutes = coalesce(p_minutes, 60),
      place = left(nullif(trim(coalesce(p_place, '')), ''), 200), details = left(nullif(trim(coalesce(p_details, '')), ''), 1500),
      link = left(nullif(trim(coalesce(p_link, '')), ''), 2000), goals = v_goals, updated_at = now()
    where id = p_id and organisation_id = p_org and cancelled_at is null returning id into v_id;
    if v_id is null then raise exception 'That session has gone.'; end if;
  else
    insert into public.careers_sessions (organisation_id, title, starts_at, minutes, place, details, link, goals, added_by_member_id)
    values (p_org, left(trim(p_title), 160), p_starts_at, coalesce(p_minutes, 60), left(nullif(trim(coalesce(p_place, '')), ''), 200),
      left(nullif(trim(coalesce(p_details, '')), ''), 1500), left(nullif(trim(coalesce(p_link, '')), ''), 2000), v_goals, private.current_member_id(p_org))
    returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.nisia_careers_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.careers_sessions;
begin
  select * into v from public.careers_sessions where id = p_id;
  if v.id is null or not private.careers_staff(v.organisation_id) then raise exception 'You can’t take this session down.'; end if;
  update public.careers_sessions set cancelled_at = now(), updated_at = now() where id = p_id;
end $$;

-- The learner's college's sessions from today to a year ahead.
create or replace function public.evia_careers() returns table (
  id uuid, title text, starts_at timestamptz, minutes int, place text, details text, link text, goals text[], interested boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.starts_at, s.minutes, s.place, s.details, s.link, s.goals,
    exists (select 1 from public.careers_interest i where i.session_id = s.id and i.enrolment_id = private.my_enrolment())
  from public.careers_sessions s
  join public.enrolments e on e.id = private.my_enrolment()
  where s.organisation_id = e.organisation_id and s.cancelled_at is null
    and s.starts_at > now() - interval '3 hours' and s.starts_at < now() + interval '400 days'
  order by s.starts_at limit 100;
$$;

create or replace function public.evia_careers_interest(p_id uuid, p_on boolean default true) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_e uuid := private.my_enrolment(); v public.careers_sessions;
begin
  if auth.uid() is null or v_e is null then raise exception 'Connect Evia to your college first.'; end if;
  select s.* into v from public.careers_sessions s join public.enrolments e on e.id = v_e
    where s.id = p_id and s.organisation_id = e.organisation_id and s.cancelled_at is null;
  if v.id is null then raise exception 'That session has been taken down.'; end if;
  if coalesce(p_on, true) then
    insert into public.careers_interest (session_id, enrolment_id) values (p_id, v_e) on conflict do nothing;
  else
    delete from public.careers_interest where session_id = p_id and enrolment_id = v_e;
  end if;
  return coalesce(p_on, true);
end $$;

revoke all on function public.nisia_careers(uuid) from public, anon;
revoke all on function public.nisia_careers_save(uuid, text, timestamptz, int, text, text, text, text[], uuid) from public, anon;
revoke all on function public.nisia_careers_cancel(uuid) from public, anon;
revoke all on function public.evia_careers() from public, anon;
revoke all on function public.evia_careers_interest(uuid, boolean) from public, anon;
grant execute on function public.nisia_careers(uuid) to authenticated;
grant execute on function public.nisia_careers_save(uuid, text, timestamptz, int, text, text, text, text[], uuid) to authenticated;
grant execute on function public.nisia_careers_cancel(uuid) to authenticated;
grant execute on function public.evia_careers() to authenticated;
grant execute on function public.evia_careers_interest(uuid, boolean) to authenticated;
