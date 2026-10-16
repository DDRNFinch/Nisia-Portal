-- Registers: when each learner came and went, why they left early, and past registers in the portal.
--   class_attendance.arrived_at / left_at / left_reason   from the tutor's register in Symi (the tutor can correct the times)
--   symi_finish_register   also keeps those three (an older Symi that doesn't send them leaves them empty)
--   nisia_registers        every register over a period, learner by learner, for the portal's Registers page and its download
-- Only adds: nothing already stored changes.

alter table public.class_attendance add column if not exists arrived_at timestamptz;
alter table public.class_attendance add column if not exists left_at timestamptz;
alter table public.class_attendance add column if not exists left_reason text;

-- p_marks: [{enrolment_id, minutes, status: present|absent, late, reason, arrived_at, left_at, left_reason}]. Only learners on the class; the tutor confirms.
create or replace function public.symi_finish_register(p_session uuid, p_marks jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; v_me uuid; m jsonb; v_e uuid; v_status text; v_min int; v_in timestamptz; v_out timestamptz; n int := 0;
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
    -- Times only for a learner who was there, and only on the session's day (give or take a day for time zones).
    v_in := case when v_status = 'present' then nullif(m ->> 'arrived_at', '')::timestamptz end;
    v_out := case when v_status = 'present' then nullif(m ->> 'left_at', '')::timestamptz end;
    if v_in is not null and abs(extract(epoch from v_in - v_s.session_date::timestamptz)) > 2 * 86400 then v_in := null; end if;
    if v_out is not null and (abs(extract(epoch from v_out - v_s.session_date::timestamptz)) > 2 * 86400 or (v_in is not null and v_out < v_in)) then v_out := null; end if;
    insert into public.class_attendance (organisation_id, session_id, enrolment_id, minutes, status, late, reason, arrived_at, left_at, left_reason, confirmed_at, confirmed_by_member_id)
    values (v_s.organisation_id, p_session, v_e, case when v_status = 'present' then v_min else 0 end, v_status,
      v_status = 'present' and coalesce((m ->> 'late')::boolean, false), case when v_status = 'absent' then left(nullif(trim(m ->> 'reason'), ''), 500) end,
      v_in, v_out, case when v_out is not null then left(nullif(trim(m ->> 'left_reason'), ''), 500) end, now(), v_me)
    on conflict (session_id, enrolment_id) do update set minutes = excluded.minutes, status = excluded.status, late = excluded.late,
      reason = excluded.reason, arrived_at = excluded.arrived_at, left_at = excluded.left_at, left_reason = excluded.left_reason,
      confirmed_at = excluded.confirmed_at, confirmed_by_member_id = excluded.confirmed_by_member_id;
    n := n + 1;
  end loop;
  update public.class_sessions set status = 'finished', finished_at = now() where id = p_session;
  return n;
end $$;

-- A changed time on a finished register is kept with the other changes.
create or replace function private.on_attendance_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.confirmed_at is not null and (old.status, old.minutes, old.late, old.reason, old.arrived_at, old.left_at, old.left_reason)
       is distinct from (new.status, new.minutes, new.late, new.reason, new.arrived_at, new.left_at, new.left_reason) then
    insert into public.attendance_changes (organisation_id, attendance_id, changed_by, before, after)
    values (new.organisation_id, new.id, auth.uid(),
      jsonb_build_object('status', old.status, 'minutes', old.minutes, 'late', old.late, 'reason', old.reason, 'arrived_at', old.arrived_at, 'left_at', old.left_at, 'left_reason', old.left_reason),
      jsonb_build_object('status', new.status, 'minutes', new.minutes, 'late', new.late, 'reason', new.reason, 'arrived_at', new.arrived_at, 'left_at', new.left_at, 'left_reason', new.left_reason));
  end if;
  return new;
end $$;

-- The portal's Registers page: every register (open or finished) between two days, newest first, each with its learners.
-- Admins and quality see the whole college's; a tutor sees their own classes'.
create or replace function public.nisia_registers(p_org uuid, p_from date, p_to date) returns table (
  session_id uuid, session_date date, class_id uuid, title text, course_code text, room text, tutor text, status text,
  starts_at timestamptz, ends_at timestamptz, finished_at timestamptz, lesson_title text, ksbs text[], learners jsonb)
language sql stable security definer set search_path = '' as $$
  select s.id, s.session_date, c.id, c.title, c.course_code, c.room, coalesce(p.display_name, ''), s.status,
    s.starts_at, s.ends_at, s.finished_at, s.lesson_title, coalesce(s.ksbs, '{}'),
    coalesce((select jsonb_agg(jsonb_build_object(
        'enrolment_id', x.enrolment_id, 'name', private.enrolment_name(x.enrolment_id),
        'status', a.status, 'late', coalesce(a.late, false), 'minutes', coalesce(a.minutes, 0), 'reason', a.reason,
        'checked_in_at', a.checked_in_at, 'arrived_at', a.arrived_at, 'left_at', a.left_at, 'left_reason', a.left_reason,
        'off', (select ab.kind from public.absences ab where ab.enrolment_id = x.enrolment_id and ab.cancelled_at is null
                 and s.session_date between ab.starts_on and ab.ends_on order by ab.created_at desc limit 1))
        order by private.enrolment_name(x.enrolment_id))
      from (select cl.enrolment_id from public.class_learners cl where cl.class_id = c.id
            union select ca.enrolment_id from public.class_attendance ca where ca.session_id = s.id) x
      left join public.class_attendance a on a.session_id = s.id and a.enrolment_id = x.enrolment_id), '[]'::jsonb)
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  left join public.organisation_members m on m.id = c.tutor_member_id
  left join public.profiles p on p.id = m.user_id
  where s.organisation_id = p_org and private.mfa_ok()
    and s.session_date between p_from and least(p_to, p_from + 400)
    and (s.status = 'finished' or s.session_date <= current_date)
    and (private.can_manage_org(p_org) or private.has_role(p_org, 'quality') or c.tutor_member_id = private.current_member_id(p_org))
  order by s.session_date desc, coalesce(s.starts_at, s.created_at) desc, c.title;
$$;

revoke all on function public.nisia_registers(uuid, date, date) from public, anon;
grant execute on function public.nisia_registers(uuid, date, date) to authenticated;
