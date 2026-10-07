-- The portal's Today board: every class with who's in, late, off with a reason and not here yet, as the registers come
-- in from Symi. The portal works out which classes are on that day from each class's days and dates, as Evia does.
--
--   nisia_today   the college's classes for one day, each with that day's register (admins and quality: all; tutors: their own)

create or replace function public.nisia_today(p_org uuid, p_day date default current_date) returns table (
  id uuid, title text, course_code text, room text, schedule jsonb, tutor text,
  session_status text, started_at timestamptz, finished_at timestamptz, lesson_title text, ksbs text[], learners jsonb)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.course_code, c.room, c.schedule, coalesce(p.display_name, ''),
    s.status, coalesce(s.starts_at, s.created_at), s.finished_at, s.lesson_title, coalesce(s.ksbs, '{}'),
    coalesce((select jsonb_agg(jsonb_build_object(
        'enrolment_id', cl.enrolment_id,
        'name', private.enrolment_name(cl.enrolment_id),
        'status', a.status, 'late', coalesce(a.late, false), 'checked_in_at', a.checked_in_at, 'confirmed', a.confirmed_at is not null,
        'off', (select ab.kind from public.absences ab where ab.enrolment_id = cl.enrolment_id and ab.cancelled_at is null
                 and p_day between ab.starts_on and ab.ends_on order by ab.created_at desc limit 1))
        order by private.enrolment_name(cl.enrolment_id))
      from public.class_learners cl
      left join public.class_attendance a on a.session_id = s.id and a.enrolment_id = cl.enrolment_id
      where cl.class_id = c.id), '[]'::jsonb)
  from public.classes c
  join public.organisation_members m on m.id = c.tutor_member_id
  left join public.profiles p on p.id = m.user_id
  left join public.class_sessions s on s.class_id = c.id and s.session_date = p_day
  where c.organisation_id = p_org and c.archived_at is null and private.mfa_ok()
    and (private.can_manage_org(p_org) or private.has_role(p_org, 'quality') or c.tutor_member_id = private.current_member_id(p_org))
  order by c.schedule->>'start' nulls last, c.title;
$$;

grant execute on function public.nisia_today(uuid, date) to authenticated;
