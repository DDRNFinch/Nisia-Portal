-- Run once in the Nisia SQL editor (4 October 2026): the classes fix, then registers through named actions.
-- Safe to run again.

-- Symi couldn't save a new class to Nisia ("new row violates row-level security policy for table classes").
-- Symi saves a class and asks for it back in one step (insert ... returning). The old rules found the class's tutor by
-- looking the class up by its id (private.is_class_tutor(id)), and a class being saved can't be looked up yet in that
-- same step, so a tutor's own new class was refused. The rules now check the row's own tutor and college.
drop policy if exists classes_read on public.classes;
drop policy if exists classes_write on public.classes;
create policy classes_read on public.classes for select
  using (private.mfa_ok() and (tutor_member_id = private.current_member_id(organisation_id) or private.can_manage_org(organisation_id)));
create policy classes_write on public.classes for all
  using (private.mfa_ok() and (tutor_member_id = private.current_member_id(organisation_id) or private.can_manage_org(organisation_id)))
  with check (private.mfa_ok() and tutor_member_id = private.current_member_id(organisation_id)
    and (private.has_role(organisation_id, 'tutor') or private.has_role(organisation_id, 'admin')));

-- Registers through named actions. Symi no longer reads or writes the class tables itself: each job is one action,
-- and the action checks who is asking before it does anything (signed in with the authenticator app, a tutor or admin
-- at that college, the class is theirs, the learners are theirs). One place for each rule.
--
--   symi_save_class        the register and its Nisia learners
--   symi_open_session      today's (or a coming day's) session, with what's being taught
--   symi_checkins          who has checked in with Evia
--   symi_finish_register   the tutor's marks: minutes, here or not, late, reason; the session is finished
--   nisia_whats_new        Evia's one request for the learner's registers: college hours, this week's classes, days off
--
-- The class tables are locked to these actions once every Symi in use has the new version (classes-lock.sql).

-- A tutor's own class (or, for the college's admins, any class at their college).
create or replace function private.own_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (select 1 from public.classes c where c.id = p_class
    and (c.tutor_member_id = private.current_member_id(c.organisation_id) or private.can_manage_org(c.organisation_id)));
$$;

create or replace function public.symi_save_class(p_org uuid, p_client_ref text, p_title text, p_room text default null,
  p_schedule jsonb default '{}'::jsonb, p_enrolments uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid; v_id uuid; e uuid;
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'Sign in to Nisia with your authenticator app first.'; end if;
  v_me := private.current_member_id(p_org);
  if v_me is null or not (private.has_role(p_org, 'tutor') or private.has_role(p_org, 'admin')) then raise exception 'You’re not a tutor at this college in Nisia.'; end if;
  if nullif(trim(coalesce(p_client_ref, '')), '') is null then raise exception 'That register has no name.'; end if;
  foreach e in array coalesce(p_enrolments, '{}') loop
    if not exists (select 1 from public.enrolments en where en.id = e and en.organisation_id = p_org) then raise exception 'A learner on this register isn’t at this college.'; end if;
    if not (private.can_tutor_enrolment(e) or private.can_manage_org(p_org)) then raise exception 'A learner on this register isn’t one of yours in Nisia. Ask the college to link them to you.'; end if;
  end loop;
  insert into public.classes (organisation_id, tutor_member_id, client_ref, title, room, schedule, updated_at)
  values (p_org, v_me, left(p_client_ref, 200), left(coalesce(nullif(trim(p_title), ''), 'Class'), 120), left(p_room, 120), coalesce(p_schedule, '{}'::jsonb), now())
  on conflict (tutor_member_id, client_ref) do update set title = excluded.title, room = excluded.room, schedule = excluded.schedule, updated_at = now()
  returning id into v_id;
  delete from public.class_learners where class_id = v_id and not (enrolment_id = any(coalesce(p_enrolments, '{}')));
  insert into public.class_learners (class_id, enrolment_id, organisation_id)
  select v_id, x, p_org from unnest(coalesce(p_enrolments, '{}')) x on conflict do nothing;
  return v_id;
end $$;

create or replace function public.symi_open_session(p_class uuid, p_date date, p_starts timestamptz default null, p_ends timestamptz default null,
  p_lesson text default null, p_summary text default null, p_ksbs text[] default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v public.class_sessions;
begin
  if not private.own_class(p_class) then raise exception 'That class isn’t yours in Nisia.'; end if;
  if p_date is null or p_date < current_date - 60 or p_date > current_date + 60 then raise exception 'That session date isn’t right.'; end if;
  select organisation_id into v_org from public.classes where id = p_class;
  insert into public.class_sessions (organisation_id, class_id, session_date, starts_at, ends_at, lesson_title, lesson_summary, ksbs)
  values (v_org, p_class, p_date, p_starts, p_ends, left(p_lesson, 200), left(p_summary, 1000), coalesce(p_ksbs, '{}'))
  on conflict (class_id, session_date) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    lesson_title = coalesce(excluded.lesson_title, public.class_sessions.lesson_title), lesson_summary = coalesce(excluded.lesson_summary, public.class_sessions.lesson_summary),
    ksbs = case when cardinality(excluded.ksbs) > 0 then excluded.ksbs else public.class_sessions.ksbs end
  returning * into v;
  return jsonb_build_object('id', v.id, 'status', v.status);
end $$;

create or replace function public.symi_checkins(p_session uuid) returns table (enrolment_id uuid, checked_in_at timestamptz, late boolean, offline boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.own_class(private.session_class(p_session)) then raise exception 'That class isn’t yours in Nisia.'; end if;
  return query select a.enrolment_id, a.checked_in_at, a.late, a.offline from public.class_attendance a where a.session_id = p_session and a.checked_in_at is not null;
end $$;

-- p_marks: [{enrolment_id, minutes, status: present|absent, late, reason}]. Only learners on the class; the tutor confirms.
create or replace function public.symi_finish_register(p_session uuid, p_marks jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; v_me uuid; m jsonb; v_e uuid; v_status text; v_min int; n int := 0;
begin
  select * into v_s from public.class_sessions where id = p_session;
  if v_s.id is null or not private.own_class(v_s.class_id) then raise exception 'That class isn’t yours in Nisia.'; end if;
  if jsonb_typeof(p_marks) <> 'array' then raise exception 'The register’s marks are missing.'; end if;
  v_me := coalesce(private.current_member_id(v_s.organisation_id), (select tutor_member_id from public.classes where id = v_s.class_id));
  for m in select * from jsonb_array_elements(p_marks) loop
    v_e := (m ->> 'enrolment_id')::uuid;
    if not exists (select 1 from public.class_learners cl where cl.class_id = v_s.class_id and cl.enrolment_id = v_e) then raise exception 'A learner on these marks isn’t on this class in Nisia.'; end if;
    v_status := case when m ->> 'status' = 'present' then 'present' else 'absent' end;
    v_min := least(1440, greatest(0, coalesce((m ->> 'minutes')::int, 0)));
    insert into public.class_attendance (organisation_id, session_id, enrolment_id, minutes, status, late, reason, confirmed_at, confirmed_by_member_id)
    values (v_s.organisation_id, p_session, v_e, case when v_status = 'present' then v_min else 0 end, v_status,
      v_status = 'present' and coalesce((m ->> 'late')::boolean, false), case when v_status = 'absent' then left(nullif(trim(m ->> 'reason'), ''), 500) end, now(), v_me)
    on conflict (session_id, enrolment_id) do update set minutes = excluded.minutes, status = excluded.status, late = excluded.late,
      reason = excluded.reason, confirmed_at = excluded.confirmed_at, confirmed_by_member_id = excluded.confirmed_by_member_id;
    n := n + 1;
  end loop;
  update public.class_sessions set status = 'finished', finished_at = now() where id = p_session;
  return n;
end $$;

-- Evia: everything about the learner's registers in one request.
create or replace function public.nisia_whats_new() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  return jsonb_build_object(
    'college', coalesce((select jsonb_agg(to_jsonb(c)) from public.nisia_my_college() c), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s)) from public.nisia_my_sessions(7) s), '[]'::jsonb),
    'absences', coalesce((select jsonb_agg(to_jsonb(a)) from public.nisia_absences() a), '[]'::jsonb));
end $$;

revoke all on function public.symi_save_class(uuid, text, text, text, jsonb, uuid[]) from public, anon;
revoke all on function public.symi_open_session(uuid, date, timestamptz, timestamptz, text, text, text[]) from public, anon;
revoke all on function public.symi_checkins(uuid) from public, anon;
revoke all on function public.symi_finish_register(uuid, jsonb) from public, anon;
revoke all on function public.nisia_whats_new() from public, anon;
grant execute on function public.symi_save_class(uuid, text, text, text, jsonb, uuid[]) to authenticated;
grant execute on function public.symi_open_session(uuid, date, timestamptz, timestamptz, text, text, text[]) to authenticated;
grant execute on function public.symi_checkins(uuid) to authenticated;
grant execute on function public.symi_finish_register(uuid, jsonb) to authenticated;
grant execute on function public.nisia_whats_new() to authenticated;
