-- Symi (tutors) and Paros (employers) on Nisia.
--
-- Symi: a tutor's classes and their learners, one session per class per day, and attendance in minutes from the
-- tutor's register. Learners check in by scanning a code on the classroom screen that changes every 20 seconds and
-- is checked here (signed with the session's own key, which only the tutor's Symi holds), so a photo sent to a friend
-- has expired before it can be used, and a made-up or edited code is turned down. A check-in only ticks the learner
-- on the tutor's register; the hours count when the tutor finishes the register, and then go into the learner's
-- off-the-job hours, confirmed by the tutor, so the learner can't change them.
--
-- Paros: employers see their own apprentices' college attendance and what was taught, their evidence and what's
-- still needed, confirm on-the-job hours, write witness testimonies and rate behaviours. Employers don't see what Evia
-- keeps for the learner's own use (evia_records).

-- ---------- Symi ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  tutor_member_id uuid not null references public.organisation_members(id) on delete restrict,
  client_ref text not null,
  title text not null check (length(title) between 1 and 120),
  course_id uuid references public.courses(id),
  room text,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tutor_member_id, client_ref)
);
create table if not exists public.class_learners (
  class_id uuid not null references public.classes(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, enrolment_id)
);
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_date date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open', 'finished')),
  lesson_title text,
  lesson_summary text,
  ksbs text[] not null default '{}',
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, session_date)
);
-- The check-in key: only the class's tutor can read it (symi_session_key), never learners.
create table if not exists private.class_session_keys (
  session_id uuid primary key references public.class_sessions(id) on delete cascade,
  secret bytea not null default extensions.gen_random_bytes(32)
);
create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  checked_in_at timestamptz,
  late boolean not null default false,
  minutes int check (minutes between 0 and 1440),
  status text check (status in ('present', 'absent')),
  confirmed_at timestamptz,
  confirmed_by_member_id uuid references public.organisation_members(id),
  unique (session_id, enrolment_id)
);
create index if not exists class_attendance_enrolment on public.class_attendance (enrolment_id);
create index if not exists class_learners_enrolment on public.class_learners (enrolment_id);

create or replace function private.is_class_tutor(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (
    select 1 from public.classes c
    where c.id = p_class
      and (c.tutor_member_id = private.current_member_id(c.organisation_id) or private.can_manage_org(c.organisation_id)));
$$;
create or replace function private.session_class(p_session uuid) returns uuid
language sql stable security definer set search_path = '' as $$ select class_id from public.class_sessions where id = p_session $$;

alter table public.classes enable row level security;
alter table public.class_learners enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_attendance enable row level security;
alter table private.class_session_keys enable row level security;

drop policy if exists classes_read on public.classes;
drop policy if exists classes_write on public.classes;
create policy classes_read on public.classes for select using (private.is_class_tutor(id));
create policy classes_write on public.classes for all
  using (private.is_class_tutor(id))
  with check (private.mfa_ok() and tutor_member_id = private.current_member_id(organisation_id)
    and (private.has_role(organisation_id, 'tutor') or private.has_role(organisation_id, 'admin')));

drop policy if exists class_learners_read on public.class_learners;
drop policy if exists class_learners_insert on public.class_learners;
drop policy if exists class_learners_delete on public.class_learners;
create policy class_learners_read on public.class_learners for select using (private.is_class_tutor(class_id) or private.can_access_enrolment(enrolment_id));
create policy class_learners_insert on public.class_learners for insert
  with check (private.is_class_tutor(class_id) and (private.can_tutor_enrolment(enrolment_id) or private.can_manage_org(organisation_id)));
create policy class_learners_delete on public.class_learners for delete using (private.is_class_tutor(class_id));

drop policy if exists class_sessions_read on public.class_sessions;
drop policy if exists class_sessions_write on public.class_sessions;
create policy class_sessions_read on public.class_sessions for select using (private.is_class_tutor(class_id));
create policy class_sessions_write on public.class_sessions for all using (private.is_class_tutor(class_id)) with check (private.is_class_tutor(class_id));

drop policy if exists class_attendance_read on public.class_attendance;
drop policy if exists class_attendance_write on public.class_attendance;
create policy class_attendance_read on public.class_attendance for select
  using (private.is_class_tutor(private.session_class(session_id)) or private.can_access_enrolment(enrolment_id));
create policy class_attendance_write on public.class_attendance for all
  using (private.is_class_tutor(private.session_class(session_id)))
  with check (private.is_class_tutor(private.session_class(session_id))
    and exists (select 1 from public.class_learners cl where cl.class_id = private.session_class(session_id) and cl.enrolment_id = class_attendance.enrolment_id));

-- The tutor's Symi gets the session's key to draw the changing code (the session must be today's).
create or replace function public.symi_session_key(p_session uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not private.is_class_tutor(private.session_class(p_session)) then raise exception 'Not allowed'; end if;
  insert into private.class_session_keys (session_id) values (p_session) on conflict do nothing;
  select encode(secret, 'base64') into v from private.class_session_keys where session_id = p_session;
  return v;
end $$;
revoke all on function public.symi_session_key(uuid) from public, anon;
grant execute on function public.symi_session_key(uuid) to authenticated;

-- A learner checks in: NISI:IN:1:<session>:<20-second window>:<signature>, or the 6 characters under the QR.
-- The code must be from the last 40 seconds, for a session running today that the learner is on.
create or replace function private.checkin_sig(p_secret bytea, p_session uuid, p_window bigint) returns text
language sql immutable set search_path = '' as $$
  select translate(rtrim(encode(extensions.hmac(convert_to(p_session::text || ':' || p_window, 'UTF8'), p_secret, 'sha256'), 'base64'), '='), '+/', '-_');
$$;
create or replace function private.checkin_short(p_sig text) returns text
language sql immutable set search_path = '' as $$
  -- 6 characters people can read and type (no 0/O, 1/I/L), from the signature.
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (get_byte(decode(rpad(translate(p_sig, '-_', '+/'), 44, '='), 'base64'), i) % 31) + 1, 1), '' order by i)
  from generate_series(0, 5) i;
$$;

create or replace function public.nisia_check_in(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_now bigint := floor(extract(epoch from now()) / 20);
  v_today date := (now() at time zone 'Europe/London')::date;
  v_session public.class_sessions;
  v_enrolment uuid;
  v_secret bytea;
  v_ok boolean := false;
  v_parts text[];
  v_row public.class_attendance;
  v_title text;
  v_w bigint;
  s record;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  if p_code ~ '^NISI:IN:1:' then
    v_parts := string_to_array(p_code, ':');
    if array_length(v_parts, 1) <> 6 or v_parts[4] !~ '^[0-9a-f-]{36}$' or v_parts[5] !~ '^[0-9]+$' then raise exception 'That code isn’t right. Scan it again.'; end if;
    select * into v_session from public.class_sessions where id = v_parts[4]::uuid;
    if v_session.id is null then raise exception 'That code isn’t for a class. Scan it again.'; end if;
    select secret into v_secret from private.class_session_keys where session_id = v_session.id;
    v_w := v_parts[5]::bigint;
    v_ok := v_secret is not null and v_w between v_now - 1 and v_now + 1 and private.checkin_sig(v_secret, v_session.id, v_w) = v_parts[6];
  else
    -- The typed code: tried against the learner's own classes running today.
    for s in
      select cs.id, k.secret from public.class_sessions cs
      join private.class_session_keys k on k.session_id = cs.id
      join public.class_learners cl on cl.class_id = cs.class_id
      join public.enrolments e on e.id = cl.enrolment_id
      join public.learners l on l.id = e.learner_id
      join public.organisation_members om on om.id = l.organisation_member_id
      where om.user_id = auth.uid() and cs.session_date = v_today and cs.status = 'open'
    loop
      for i in -1 .. 1 loop
        if private.checkin_short(private.checkin_sig(s.secret, s.id, v_now + i)) = v_code then
          select * into v_session from public.class_sessions where id = s.id; v_ok := true; exit;
        end if;
      end loop;
      exit when v_ok;
    end loop;
  end if;
  if not v_ok then raise exception 'That code has changed. Scan the one on the screen now.'; end if;
  if v_session.session_date <> v_today or v_session.status <> 'open' then raise exception 'This class register is closed.'; end if;

  select e.id into v_enrolment
  from public.class_learners cl
  join public.enrolments e on e.id = cl.enrolment_id
  join public.learners l on l.id = e.learner_id
  join public.organisation_members om on om.id = l.organisation_member_id
  where cl.class_id = v_session.class_id and om.user_id = auth.uid() and om.active
  limit 1;
  if v_enrolment is null then raise exception 'You’re not on this class’s register. Ask your tutor to add you.'; end if;

  insert into public.class_attendance (organisation_id, session_id, enrolment_id, checked_in_at, late)
  values (v_session.organisation_id, v_session.id, v_enrolment, now(), v_session.starts_at is not null and now() > v_session.starts_at + interval '10 minutes')
  on conflict (session_id, enrolment_id) do update set checked_in_at = coalesce(public.class_attendance.checked_in_at, excluded.checked_in_at),
    late = case when public.class_attendance.checked_in_at is null then excluded.late else public.class_attendance.late end
  returning * into v_row;
  select title into v_title from public.classes where id = v_session.class_id;
  return jsonb_build_object('class', v_title, 'lesson', v_session.lesson_title, 'at', v_row.checked_in_at, 'late', v_row.late,
    'again', v_row.checked_in_at < now() - interval '2 seconds');
end $$;
revoke all on function public.nisia_check_in(text) from public, anon;
grant execute on function public.nisia_check_in(text) to authenticated;

-- Finished registers become the learner's off-the-job hours, confirmed by the tutor (so the learner can't change
-- them). Marked absent, or changed to no time, and they go.
create or replace function private.on_attendance_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; v_title text; v_tutor uuid;
begin
  if new.confirmed_at is null then return new; end if;
  select * into v_s from public.class_sessions where id = new.session_id;
  select title, tutor_member_id into v_title, v_tutor from public.classes where id = v_s.class_id;
  if coalesce(new.minutes, 0) <= 0 or new.status = 'absent' then
    delete from public.otj_entries where id = new.id;
    return new;
  end if;
  insert into public.otj_entries (id, organisation_id, enrolment_id, created_by_member_id, activity_date, activity_type, subject, description, hours)
  values (new.id, new.organisation_id, new.enrolment_id, coalesce(new.confirmed_by_member_id, v_tutor), v_s.session_date, 'college', v_title,
    left(concat_ws(': ', 'College · ' || v_title, v_s.lesson_title), 2000), least(24, round(new.minutes / 60.0, 2)))
  on conflict (id) do update set hours = excluded.hours, description = excluded.description, activity_date = excluded.activity_date, updated_at = now();
  insert into public.otj_confirmations (organisation_id, otj_entry_id, confirmer_member_id, decision, comment)
  values (new.organisation_id, new.id, coalesce(new.confirmed_by_member_id, v_tutor), 'approved', 'College register')
  on conflict (otj_entry_id, confirmer_member_id) do nothing;
  return new;
end $$;
drop trigger if exists attendance_to_otj on public.class_attendance;
create trigger attendance_to_otj after insert or update of minutes, status, confirmed_at on public.class_attendance
  for each row execute function private.on_attendance_confirmed();

-- Evia: the learner's college sessions (their own, confirmed by the tutor), with what was taught.
create or replace function public.nisia_my_college() returns table (
  id uuid, session_date date, class text, lesson text, ksbs text[], minutes int, status text, checked_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, s.session_date, c.title, s.lesson_title, s.ksbs, a.minutes, a.status, a.checked_in_at
  from public.class_attendance a
  join public.class_sessions s on s.id = a.session_id
  join public.classes c on c.id = s.class_id
  where private.is_own_enrolment(a.enrolment_id) and a.confirmed_at is not null
  order by s.session_date desc
  limit 400;
$$;
revoke all on function public.nisia_my_college() from public, anon;
grant execute on function public.nisia_my_college() to authenticated;

