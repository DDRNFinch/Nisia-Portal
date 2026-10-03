-- Registers: Symi's attendance made dependable, for colleges where the register is the thing that matters most.
--
-- Each college sets its own rules (attendance_settings): how many minutes after the start a learner is late, its
-- attendance target, and how many unexplained absences in a row raise the alarm.
-- Absences: anyone who works with a learner can book one, and so can the learner (Evia, Symi, Milos, Paros): the dates
-- and a reason in their own words. Everyone with the learner is told. On the register the learner shows with that
-- reason instead of as missing.
-- Every mark is one of: checked in (on time or late), absent with a reason, or absent with no reason. An absence with
-- no reason, once the register is finished, tells the learner, their tutor and assessor, and their employer the same
-- day; too many in a row and the college's admins are told too.
-- Poor or no signal: Evia keeps a scanned code and sends it when it can. The code itself proves when it was on the
-- classroom screen (it's signed for that 20-second window), so the check-in is recorded at that time, marked as made
-- offline for the tutor to see.
-- Every change to a finished register is kept (attendance_changes): who, when, from what to what.

-- ---------- The college's rules ----------
create table if not exists public.attendance_settings (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  late_minutes int not null default 10 check (late_minutes between 0 and 120),
  target_pct int not null default 90 check (target_pct between 50 and 100),
  alert_after int not null default 2 check (alert_after between 1 and 10),
  updated_at timestamptz not null default now()
);
alter table public.attendance_settings enable row level security;
drop policy if exists attendance_settings_read on public.attendance_settings;
drop policy if exists attendance_settings_write on public.attendance_settings;
create policy attendance_settings_read on public.attendance_settings for select using (private.current_member_id(organisation_id) is not null);
create policy attendance_settings_write on public.attendance_settings for all using (private.can_manage_org(organisation_id)) with check (private.can_manage_org(organisation_id));
grant select, insert, update on public.attendance_settings to authenticated;
revoke all on public.attendance_settings from anon;

create or replace function private.att_settings(p_org uuid) returns public.attendance_settings
language sql stable security definer set search_path = '' as $$
  select coalesce((select s from public.attendance_settings s where s.organisation_id = p_org),
    row(p_org, 10, 90, 2, now())::public.attendance_settings);
$$;

-- ---------- Absences ----------
create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  kind text not null check (kind in ('ill', 'holiday', 'appointment', 'work', 'other')),
  reason text check (length(reason) <= 500),
  booked_by_member_id uuid not null references public.organisation_members(id) on delete restrict,
  booked_by_role text not null check (booked_by_role in ('learner', 'tutor', 'assessor', 'employer', 'admin')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 366)
);
create index if not exists absences_enrolment on public.absences (enrolment_id, starts_on);
alter table public.absences enable row level security;
drop policy if exists absences_read on public.absences;
create policy absences_read on public.absences for select using (private.can_access_enrolment(enrolment_id));
grant select on public.absences to authenticated;
revoke all on public.absences from anon;

-- The reason for an absence, as people read it.
create or replace function private.absence_text(p_kind text, p_reason text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(p_reason), ''), case p_kind when 'ill' then 'Ill' when 'holiday' then 'Holiday'
    when 'appointment' then 'Appointment' when 'work' then 'At work' else 'Other' end);
$$;

-- Employers with access to a learner (the staff notice only reaches assessors and tutors).
create or replace function private.notify_employers_for_enrolment(p_enrolment_id uuid, p_org_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(organisation_id, recipient_user_id, notification_type, title, body, data)
  select distinct p_org_id, om.user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb)
  from public.enrolments e
  join public.learner_access la on la.learner_id = e.learner_id and la.organisation_id = e.organisation_id
  join public.organisation_members om on om.id = la.organisation_member_id and om.active
  join public.organisation_member_roles omr on omr.organisation_member_id = om.id
  join public.roles r on r.id = omr.role_id
  where e.id = p_enrolment_id and e.organisation_id = p_org_id and r.code = 'employer';
end $$;
-- The college's admins (for absences that keep happening).
create or replace function private.notify_org_admins(p_org_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(organisation_id, recipient_user_id, notification_type, title, body, data)
  select distinct p_org_id, om.user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb)
  from public.organisation_members om
  join public.organisation_member_roles omr on omr.organisation_member_id = om.id
  join public.roles r on r.id = omr.role_id
  where om.organisation_id = p_org_id and om.active and r.code in ('admin', 'quality');
end $$;
-- Everyone who works with the learner, and the learner.
create or replace function private.notify_everyone_for_enrolment(p_enrolment_id uuid, p_org_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb, p_learner_body text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_learner_for_enrolment(p_enrolment_id, p_org_id, p_type, p_title, coalesce(p_learner_body, p_body), p_data);
  perform private.notify_assigned_staff_for_enrolment(p_enrolment_id, p_org_id, p_type || '_staff', p_title, p_body, p_data);
  perform private.notify_employers_for_enrolment(p_enrolment_id, p_org_id, p_type || '_staff', p_title, p_body, p_data);
end $$;
create or replace function private.enrolment_name(p_enrolment uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(p.display_name, 'A learner') from public.enrolments e join public.learners l on l.id = e.learner_id
  join public.organisation_members om on om.id = l.organisation_member_id left join public.profiles p on p.id = om.user_id where e.id = p_enrolment;
$$;
create or replace function private.say_dates(p_from date, p_to date) returns text
language sql immutable set search_path = '' as $$
  select case when p_from = p_to then to_char(p_from, 'FMDy FMDD FMMon') else to_char(p_from, 'FMDD FMMon') || ' to ' || to_char(p_to, 'FMDD FMMon') end;
$$;

-- Book an absence. Learners book their own (no enrolment given: their current one); staff and employers book for a
-- learner they work with.
create or replace function public.nisia_book_absence(p_from date, p_to date, p_kind text, p_reason text default null, p_enrolment uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_e public.enrolments; v_member uuid; v_role text; v_id uuid; v_name text; v_text text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_enrolment is null then
    select e.* into v_e from public.enrolments e join public.learners l on l.id = e.learner_id
      join public.organisation_members om on om.id = l.organisation_member_id
      where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
  else select * into v_e from public.enrolments where id = p_enrolment; end if;
  if v_e.id is null or not private.can_access_enrolment(v_e.id) then raise exception 'You can’t book an absence for this learner.'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose the first and last day.'; end if;
  if p_to > p_from + 366 then raise exception 'An absence can be at most a year.'; end if;
  if p_kind is null or p_kind not in ('ill', 'holiday', 'appointment', 'work', 'other') then raise exception 'Choose a reason.'; end if;
  if p_kind = 'other' and nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Say what the reason is.'; end if;
  v_member := private.current_member_id(v_e.organisation_id);
  v_role := case when private.is_own_enrolment(v_e.id) then 'learner' when private.has_role(v_e.organisation_id, 'tutor') then 'tutor'
    when private.has_role(v_e.organisation_id, 'assessor') then 'assessor' when private.has_role(v_e.organisation_id, 'employer') then 'employer' else 'admin' end;
  insert into public.absences (organisation_id, enrolment_id, starts_on, ends_on, kind, reason, booked_by_member_id, booked_by_role)
  values (v_e.organisation_id, v_e.id, p_from, p_to, p_kind, nullif(trim(coalesce(p_reason, '')), ''), v_member, v_role)
  returning id into v_id;
  -- Registers already finished or open in those days take the reason straight away.
  update public.class_attendance a set reason = private.absence_text(p_kind, p_reason), absence_id = v_id
  from public.class_sessions s where s.id = a.session_id and a.enrolment_id = v_e.id and s.session_date between p_from and p_to
    and a.checked_in_at is null and coalesce(a.status, 'absent') = 'absent' and a.reason is null;
  v_name := private.enrolment_name(v_e.id); v_text := private.absence_text(p_kind, p_reason);
  perform private.notify_everyone_for_enrolment(v_e.id, v_e.organisation_id, 'absence_booked', 'Absence: ' || v_name,
    v_name || ' won’t be in on ' || private.say_dates(p_from, p_to) || ' (' || v_text || ').', jsonb_build_object('absence_id', v_id, 'enrolment_id', v_e.id, 'open', 'absences'),
    'Your absence on ' || private.say_dates(p_from, p_to) || ' (' || v_text || ') is booked. Your tutor, assessor and employer have been told.');
  return jsonb_build_object('id', v_id, 'from', p_from, 'to', p_to, 'reason', v_text);
end $$;
-- Cancel one: the person who booked it, the learner, or the college's admins.
create or replace function public.nisia_cancel_absence(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.absences;
begin
  select * into v from public.absences where id = p_id;
  if v.id is null or not (v.booked_by_member_id = private.current_member_id(v.organisation_id) or private.is_own_enrolment(v.enrolment_id) or private.can_manage_org(v.organisation_id))
    then raise exception 'You can’t cancel this absence.'; end if;
  update public.absences set cancelled_at = now() where id = p_id and cancelled_at is null;
  update public.class_attendance set reason = null, absence_id = null where absence_id = p_id and confirmed_at is null;
end $$;
-- A learner's absences (their own, or one they work with), newest first.
create or replace function public.nisia_absences(p_enrolment uuid default null) returns table (
  id uuid, enrolment_id uuid, starts_on date, ends_on date, kind text, reason text, booked_by text, booked_by_role text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.enrolment_id, a.starts_on, a.ends_on, a.kind, private.absence_text(a.kind, a.reason), coalesce(p.display_name, ''), a.booked_by_role, a.created_at
  from public.absences a
  join public.organisation_members om on om.id = a.booked_by_member_id
  left join public.profiles p on p.id = om.user_id
  where a.cancelled_at is null
    and (case when p_enrolment is null then private.is_own_enrolment(a.enrolment_id) else a.enrolment_id = p_enrolment and private.can_access_enrolment(p_enrolment) end)
    and a.ends_on >= (now() at time zone 'Europe/London')::date - 120
  order by a.starts_on desc limit 200;
$$;
revoke all on function public.nisia_book_absence(date, date, text, text, uuid) from public, anon;
revoke all on function public.nisia_cancel_absence(uuid) from public, anon;
revoke all on function public.nisia_absences(uuid) from public, anon;
grant execute on function public.nisia_book_absence(date, date, text, text, uuid) to authenticated;
grant execute on function public.nisia_cancel_absence(uuid) to authenticated;
grant execute on function public.nisia_absences(uuid) to authenticated;

-- ---------- Marks: checked in, absent with a reason, absent with none ----------
alter table public.class_attendance
  add column if not exists reason text check (length(reason) <= 500),
  add column if not exists absence_id uuid references public.absences(id) on delete set null,
  add column if not exists offline boolean not null default false;

-- A booked absence gives a learner who isn't there its reason.
create or replace function private.on_attendance_reason() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_a public.absences; v_date date;
begin
  if new.checked_in_at is null and coalesce(new.status, 'absent') = 'absent' and new.reason is null then
    select session_date into v_date from public.class_sessions where id = new.session_id;
    select * into v_a from public.absences where enrolment_id = new.enrolment_id and cancelled_at is null and v_date between starts_on and ends_on order by created_at desc limit 1;
    if v_a.id is not null then new.reason := private.absence_text(v_a.kind, v_a.reason); new.absence_id := v_a.id; end if;
  end if;
  if new.status = 'present' then new.reason := null; new.absence_id := null; end if;
  return new;
end $$;
drop trigger if exists attendance_reason on public.class_attendance;
create trigger attendance_reason before insert or update on public.class_attendance for each row execute function private.on_attendance_reason();

-- Every change to a mark once the register is finished.
create table if not exists public.attendance_changes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  attendance_id uuid not null references public.class_attendance(id) on delete cascade,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  before jsonb not null,
  after jsonb not null
);
alter table public.attendance_changes enable row level security;
drop policy if exists attendance_changes_read on public.attendance_changes;
create policy attendance_changes_read on public.attendance_changes for select
  using (private.can_manage_org(organisation_id) or private.has_role(organisation_id, 'quality')
    or exists (select 1 from public.class_attendance a where a.id = attendance_id and private.is_class_tutor(private.session_class(a.session_id))));
grant select on public.attendance_changes to authenticated;
revoke all on public.attendance_changes from anon;
create or replace function private.on_attendance_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.confirmed_at is not null and (old.status, old.minutes, old.late, old.reason) is distinct from (new.status, new.minutes, new.late, new.reason) then
    insert into public.attendance_changes (organisation_id, attendance_id, changed_by, before, after)
    values (new.organisation_id, new.id, auth.uid(),
      jsonb_build_object('status', old.status, 'minutes', old.minutes, 'late', old.late, 'reason', old.reason),
      jsonb_build_object('status', new.status, 'minutes', new.minutes, 'late', new.late, 'reason', new.reason));
  end if;
  return new;
end $$;
drop trigger if exists attendance_changed on public.class_attendance;
create trigger attendance_changed after update on public.class_attendance for each row execute function private.on_attendance_changed();

-- A finished register: an absence with no reason tells everyone today; too many in a row tells the college's admins.
create or replace function private.on_attendance_absent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; v_title text; v_name text; v_set public.attendance_settings; v_run int;
begin
  if new.confirmed_at is null or new.status is distinct from 'absent' or new.reason is not null then return new; end if;
  if tg_op = 'UPDATE' and old.confirmed_at is not null and old.status = 'absent' and old.reason is null then return new; end if;
  select * into v_s from public.class_sessions where id = new.session_id;
  if v_s.session_date < (now() at time zone 'Europe/London')::date - 7 then return new; end if;
  select title into v_title from public.classes where id = v_s.class_id;
  v_name := private.enrolment_name(new.enrolment_id);
  perform private.notify_everyone_for_enrolment(new.enrolment_id, new.organisation_id, 'absent_no_reason', 'Missed college: ' || v_name,
    v_name || ' wasn’t at ' || coalesce(v_title, 'college') || ' on ' || to_char(v_s.session_date, 'FMDy FMDD FMMon') || ' and no reason was given.',
    jsonb_build_object('attendance_id', new.id, 'enrolment_id', new.enrolment_id, 'open', 'absences'),
    'You were marked absent from ' || coalesce(v_title, 'college') || ' on ' || to_char(v_s.session_date, 'FMDy FMDD FMMon') || '. If there was a reason, tell us in Evia.');
  -- How many finished registers in a row, most recent first, were absences with no reason.
  v_set := private.att_settings(new.organisation_id);
  select count(*) into v_run from (
    select a.status, a.reason, a.checked_in_at, row_number() over (order by s.session_date desc, s.starts_at desc nulls last) n,
      sum(case when a.status = 'absent' and a.reason is null then 0 else 1 end) over (order by s.session_date desc, s.starts_at desc nulls last) broken
    from public.class_attendance a join public.class_sessions s on s.id = a.session_id
    where a.enrolment_id = new.enrolment_id and a.confirmed_at is not null) x
  where broken = 0;
  if v_run = v_set.alert_after then
    perform private.notify_org_admins(new.organisation_id, 'absent_streak', 'Attendance concern: ' || v_name,
      v_name || ' has missed ' || v_run || ' sessions in a row with no reason given.', jsonb_build_object('enrolment_id', new.enrolment_id, 'open', 'attendance'));
    perform private.notify_assigned_staff_for_enrolment(new.enrolment_id, new.organisation_id, 'absent_streak_staff', 'Attendance concern: ' || v_name,
      v_name || ' has missed ' || v_run || ' sessions in a row with no reason given.', jsonb_build_object('enrolment_id', new.enrolment_id, 'open', 'attendance'));
  end if;
  return new;
end $$;
drop trigger if exists attendance_absent on public.class_attendance;
create trigger attendance_absent after insert or update of confirmed_at, status, reason on public.class_attendance for each row execute function private.on_attendance_absent();

-- ---------- Checking in, with or without signal ----------
-- p_scanned_at: when Evia saved the code with no signal. The code is still checked against the session's key, and
-- the check-in is recorded at the time the code was on the screen, marked as made offline for the tutor to see.
drop function if exists public.nisia_check_in(text);
create or replace function public.nisia_check_in(p_code text, p_scanned_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_now bigint := floor(extract(epoch from now()) / 20);
  v_offline boolean := p_scanned_at is not null and p_scanned_at < now() - interval '60 seconds';
  v_at bigint;
  v_today date;
  v_session public.class_sessions;
  v_enrolment uuid;
  v_secret bytea;
  v_ok boolean := false;
  v_parts text[];
  v_row public.class_attendance;
  v_title text;
  v_w bigint;
  v_when timestamptz;
  v_late boolean;
  s record;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  if v_offline and p_scanned_at < now() - interval '3 days' then raise exception 'That check-in is too old to send now. Tell your tutor.'; end if;
  v_at := case when v_offline then floor(extract(epoch from p_scanned_at) / 20) else v_now end;
  v_today := (to_timestamp(v_at * 20) at time zone 'Europe/London')::date;
  if p_code ~ '^NISI:IN:1:' then
    v_parts := string_to_array(p_code, ':');
    if array_length(v_parts, 1) <> 6 or v_parts[4] !~ '^[0-9a-f-]{36}$' or v_parts[5] !~ '^[0-9]+$' then raise exception 'That code isn’t right. Scan it again.'; end if;
    select * into v_session from public.class_sessions where id = v_parts[4]::uuid;
    if v_session.id is null then raise exception 'That code isn’t for a class. Scan it again.'; end if;
    select secret into v_secret from private.class_session_keys where session_id = v_session.id;
    v_w := v_parts[5]::bigint;
    -- Live: the code from now (give or take one change). Offline: from when Evia says it was scanned, give or take
    -- a minute for the phone's clock; the window in the code is what's recorded.
    v_ok := v_secret is not null and private.checkin_sig(v_secret, v_session.id, v_w) = v_parts[6]
      and (case when v_offline then v_w between v_at - 3 and v_at + 3 else v_w between v_now - 1 and v_now + 1 end);
    if v_ok and v_offline then v_at := v_w; end if;
  else
    for s in
      select cs.id, k.secret from public.class_sessions cs
      join private.class_session_keys k on k.session_id = cs.id
      join public.class_learners cl on cl.class_id = cs.class_id
      join public.enrolments e on e.id = cl.enrolment_id
      join public.learners l on l.id = e.learner_id
      join public.organisation_members om on om.id = l.organisation_member_id
      where om.user_id = auth.uid() and cs.session_date = v_today and (v_offline or cs.status = 'open')
    loop
      for i in (case when v_offline then -3 else -1 end) .. (case when v_offline then 3 else 1 end) loop
        if private.checkin_short(private.checkin_sig(s.secret, s.id, v_at + i)) = v_code then
          select * into v_session from public.class_sessions where id = s.id; v_ok := true; v_at := v_at + i; exit;
        end if;
      end loop;
      exit when v_ok;
    end loop;
  end if;
  if not v_ok then raise exception '%', case when v_offline then 'That saved code didn’t match the one on the screen. Tell your tutor.' else 'That code has changed. Scan the one on the screen now.' end; end if;
  if v_session.session_date <> v_today then raise exception 'That code is for another day.'; end if;
  if not v_offline and v_session.status <> 'open' then raise exception 'This class register is closed. Tell your tutor you were there.'; end if;

  select e.id into v_enrolment
  from public.class_learners cl
  join public.enrolments e on e.id = cl.enrolment_id
  join public.learners l on l.id = e.learner_id
  join public.organisation_members om on om.id = l.organisation_member_id
  where cl.class_id = v_session.class_id and om.user_id = auth.uid() and om.active
  limit 1;
  if v_enrolment is null then raise exception 'You’re not on this class’s register. Ask your tutor to add you.'; end if;

  v_when := case when v_offline then to_timestamp(v_at * 20) else now() end;
  v_late := v_session.starts_at is not null and v_when > v_session.starts_at + make_interval(mins => (private.att_settings(v_session.organisation_id)).late_minutes);
  insert into public.class_attendance (organisation_id, session_id, enrolment_id, checked_in_at, late, offline)
  values (v_session.organisation_id, v_session.id, v_enrolment, v_when, v_late, v_offline)
  on conflict (session_id, enrolment_id) do update set checked_in_at = coalesce(public.class_attendance.checked_in_at, excluded.checked_in_at),
    late = case when public.class_attendance.checked_in_at is null then excluded.late else public.class_attendance.late end,
    offline = case when public.class_attendance.checked_in_at is null then excluded.offline else public.class_attendance.offline end
  returning * into v_row;
  select title into v_title from public.classes where id = v_session.class_id;
  -- A check-in that arrives after the register is finished goes to the tutor to decide (it doesn't change the mark).
  if v_session.status = 'finished' and v_row.offline and v_row.checked_in_at = v_when then
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select v_session.organisation_id, om.user_id, 'late_check_in', 'Check-in after the register: ' || private.enrolment_name(v_enrolment),
      private.enrolment_name(v_enrolment) || ' checked in to ' || v_title || ' at ' || to_char(v_when at time zone 'Europe/London', 'HH24:MI')
        || ' with no signal. It reached Nisia after you finished the register.', jsonb_build_object('attendance_id', v_row.id, 'session_id', v_session.id, 'open', 'register')
    from public.classes c join public.organisation_members om on om.id = c.tutor_member_id where c.id = v_session.class_id;
  end if;
  return jsonb_build_object('class', v_title, 'lesson', v_session.lesson_title, 'at', v_row.checked_in_at, 'late', v_row.late, 'offline', v_row.offline,
    'again', v_row.checked_in_at < v_when - interval '2 seconds', 'finished', v_session.status = 'finished');
end $$;
revoke all on function public.nisia_check_in(text, timestamptz) from public, anon;
grant execute on function public.nisia_check_in(text, timestamptz) to authenticated;

-- ---------- Evia: the learner's sessions this week, so Evia knows when to say "Check in" (and works offline) ----------
create or replace function public.nisia_my_sessions(p_days int default 7) returns table (
  id uuid, session_date date, starts_at timestamptz, ends_at timestamptz, class text, room text, lesson text, status text,
  checked_in_at timestamptz, late boolean, reason text, absence_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.id, s.session_date, s.starts_at, s.ends_at, c.title, c.room, s.lesson_title, s.status, a.checked_in_at, coalesce(a.late, false),
    coalesce(a.reason, (select private.absence_text(ab.kind, ab.reason) from public.absences ab where ab.enrolment_id = cl.enrolment_id and ab.cancelled_at is null
      and s.session_date between ab.starts_on and ab.ends_on order by ab.created_at desc limit 1)),
    coalesce(a.absence_id, (select ab.id from public.absences ab where ab.enrolment_id = cl.enrolment_id and ab.cancelled_at is null
      and s.session_date between ab.starts_on and ab.ends_on order by ab.created_at desc limit 1))
  from public.class_learners cl
  join public.class_sessions s on s.class_id = cl.class_id
  join public.classes c on c.id = cl.class_id
  left join public.class_attendance a on a.session_id = s.id and a.enrolment_id = cl.enrolment_id
  where private.is_own_enrolment(cl.enrolment_id)
    and s.session_date between (now() at time zone 'Europe/London')::date and (now() at time zone 'Europe/London')::date + least(greatest(p_days, 0), 31)
  order by s.session_date, s.starts_at nulls last;
$$;
revoke all on function public.nisia_my_sessions(int) from public, anon;
grant execute on function public.nisia_my_sessions(int) to authenticated;

-- Evia's college history now says why a learner wasn't there.
drop function if exists public.nisia_my_college();
create or replace function public.nisia_my_college() returns table (
  id uuid, session_date date, class text, lesson text, ksbs text[], minutes int, status text, checked_in_at timestamptz, late boolean, reason text)
language sql stable security definer set search_path = '' as $$
  select a.id, s.session_date, c.title, s.lesson_title, s.ksbs, a.minutes, a.status, a.checked_in_at, a.late, a.reason
  from public.class_attendance a
  join public.class_sessions s on s.id = a.session_id
  join public.classes c on c.id = s.class_id
  where private.is_own_enrolment(a.enrolment_id) and a.confirmed_at is not null
  order by s.session_date desc
  limit 400;
$$;
revoke all on function public.nisia_my_college() from public, anon;
grant execute on function public.nisia_my_college() to authenticated;

-- Symi: the tutor's learners' absences over some days, to show on the register before anyone arrives.
create or replace function public.symi_absences(p_from date, p_to date) returns table (
  id uuid, enrolment_id uuid, starts_on date, ends_on date, kind text, reason text, booked_by text, booked_by_role text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.enrolment_id, a.starts_on, a.ends_on, a.kind, private.absence_text(a.kind, a.reason), coalesce(p.display_name, ''), a.booked_by_role
  from public.absences a
  join public.organisation_members om on om.id = a.booked_by_member_id
  left join public.profiles p on p.id = om.user_id
  where a.cancelled_at is null and a.starts_on <= p_to and a.ends_on >= p_from and p_to <= p_from + 62
    and exists (select 1 from public.class_learners cl join public.classes c on c.id = cl.class_id
      where cl.enrolment_id = a.enrolment_id and private.is_class_tutor(c.id))
  order by a.starts_on;
$$;
revoke all on function public.symi_absences(date, date) from public, anon;
grant execute on function public.symi_absences(date, date) to authenticated;

-- ---------- Attendance report: each learner, over a period ----------
create or replace function public.nisia_attendance_report(p_org uuid, p_from date, p_to date) returns table (
  enrolment_id uuid, name text, course text, employer text, sessions int, present int, late int, with_reason int, no_reason int,
  pct int, below_target boolean, run int, last_absent date)
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean; v_target int;
begin
  v_all := private.can_manage_org(p_org) or (private.mfa_ok() and private.has_role(p_org, 'quality')) or private.is_platform_admin();
  if not private.mfa_ok() or not (v_all or private.has_role(p_org, 'assessor') or private.has_role(p_org, 'tutor')) then raise exception 'Not allowed'; end if;
  v_target := (private.att_settings(p_org)).target_pct;
  return query
    with marks as (
      select a.enrolment_id e, s.session_date d, s.starts_at st, coalesce(a.status = 'present', a.checked_in_at is not null) here, a.late, a.reason
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id
      where a.organisation_id = p_org and a.confirmed_at is not null and s.session_date between p_from and p_to),
    agg as (
      select m.e, count(*)::int n, count(*) filter (where m.here)::int h, count(*) filter (where m.here and m.late)::int lt,
        count(*) filter (where not m.here and m.reason is not null)::int wr, count(*) filter (where not m.here and m.reason is null)::int nr,
        max(m.d) filter (where not m.here) la
      from marks m group by m.e),
    runs as (
      select x.e, count(*)::int r from (
        select m.e, sum(case when not m.here and m.reason is null then 0 else 1 end) over (partition by m.e order by m.d desc, m.st desc nulls last) broken from marks m) x
      where x.broken = 0 group by x.e)
    select en.id, coalesce(p.display_name, ''), coalesce(c.title, ''), coalesce(en.employer_name, ''),
      coalesce(g.n, 0), coalesce(g.h, 0), coalesce(g.lt, 0), coalesce(g.wr, 0), coalesce(g.nr, 0),
      case when coalesce(g.n, 0) = 0 then null else round(100.0 * g.h / g.n)::int end,
      coalesce(g.n, 0) > 0 and round(100.0 * g.h / g.n) < v_target,
      coalesce(r.r, 0), g.la
    from public.enrolments en
    join public.learners l on l.id = en.learner_id
    join public.organisation_members om on om.id = l.organisation_member_id
    left join public.profiles p on p.id = om.user_id
    left join public.courses c on c.id = en.course_id
    left join agg g on g.e = en.id
    left join runs r on r.e = en.id
    where en.organisation_id = p_org and en.status not in ('withdrawn', 'completed')
      and (v_all or exists (select 1 from public.learner_access la where la.learner_id = l.id and la.organisation_member_id = private.current_member_id(p_org)))
    order by (coalesce(g.n, 0) > 0 and round(100.0 * g.h / nullif(g.n, 0)) < v_target) desc, coalesce(p.display_name, '');
end $$;
revoke all on function public.nisia_attendance_report(uuid, date, date) from public, anon;
grant execute on function public.nisia_attendance_report(uuid, date, date) to authenticated;

-- Paros: the employer sees why their apprentice wasn't at college, and what's booked.
create or replace function public.paros_absences(p_enrolment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_employer_enrolment(p_enrolment) then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'absences', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'from', x.starts_on, 'to', x.ends_on, 'reason', x.reason, 'by', x.booked_by, 'role', x.booked_by_role) order by x.starts_on desc)
      from public.nisia_absences(p_enrolment) x), '[]'::jsonb),
    'marks', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'date', s.session_date, 'class', c.title, 'late', a.late, 'reason', a.reason,
        'here', coalesce(a.status = 'present', a.checked_in_at is not null)) order by s.session_date desc)
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id join public.classes c on c.id = s.class_id
      where a.enrolment_id = p_enrolment and a.confirmed_at is not null), '[]'::jsonb));
end $$;
revoke all on function public.paros_absences(uuid) from public, anon;
grant execute on function public.paros_absences(uuid) to authenticated;
